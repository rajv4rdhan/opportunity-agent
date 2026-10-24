"""Knowledge graph: Neo4j when available, in-memory networkx otherwise."""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Protocol

import networkx as nx

from app.config import settings
from app.core.chaos import maybe_fail
from app.core.events import emit
from app.core.utils import slugify
from app.models.opportunity import Opportunity
from app.models.profile import GitHubInsights, StudentProfile

if TYPE_CHECKING:
    from app.core.agent import AgentCtx

_LABEL_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

CONSTRAINTS = [
    "CREATE CONSTRAINT student_id IF NOT EXISTS FOR (n:Student) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT opp_id IF NOT EXISTS FOR (n:Opportunity) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (n:Skill) REQUIRE n.name IS UNIQUE",
    "CREATE CONSTRAINT project_id IF NOT EXISTS FOR (n:Project) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT req_id IF NOT EXISTS FOR (n:Requirement) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT org_name IF NOT EXISTS FOR (n:Organization) REQUIRE n.name IS UNIQUE",
    "CREATE CONSTRAINT country_name IF NOT EXISTS FOR (n:Country) REQUIRE n.name IS UNIQUE",
    "CREATE CONSTRAINT source_url IF NOT EXISTS FOR (n:Source) REQUIRE n.url IS UNIQUE",
]

EXPLAIN_PATHS = """
MATCH p=(s:Student {id:$sid})-[:BUILT]->(:Project)-[:USES]->(:Skill)<-[:VALUES]-(o:Opportunity {id:$oid})
RETURN p LIMIT $limit
UNION
MATCH p=(s:Student {id:$sid})-[:HAS_SKILL]->(:Skill)<-[:VALUES]-(o:Opportunity {id:$oid})
RETURN p LIMIT $limit
"""

RECENT_OPPORTUNITIES = """
MATCH (o:Opportunity)-[:OFFERED_BY]->(:Organization)-[:LOCATED_IN]->(c:Country)
WHERE ($countries = [] OR c.name IN $countries)
  AND o.verified_at IS NOT NULL AND o.verified_at > $cutoff
RETURN o.data_json AS data
LIMIT 50
"""

EXPORT_STUDENT = "MATCH (s:Student {id:$sid})-[r]-(n) RETURN s, r, n LIMIT 150"
EXPORT_MATCHED = """
MATCH (s:Student {id:$sid})-[:MATCHED]->(o:Opportunity)-[r]-(n)
RETURN o, r, n LIMIT 150
"""


class GraphStore(Protocol):
    async def init(self) -> None: ...
    async def upsert_student(self, student_id: str, profile: StudentProfile, github: GitHubInsights | None) -> None: ...
    async def upsert_opportunity(self, opportunity: Opportunity) -> None: ...
    async def link_eligibility(self, student_id: str, opportunity: Opportunity) -> None: ...
    async def explain_paths(self, student_id: str, opp_id: str, limit: int = 3) -> list[list[str]]: ...
    async def recent_opportunities(self, countries: list[str], days: int = 14) -> list[Opportunity]: ...
    async def export(self, student_id: str) -> dict: ...


# --------------------------------------------------------------------------- #
# Triples (shared by both backends)
# --------------------------------------------------------------------------- #
def _node(node_id: str, label: str, node_type: str, **props: Any) -> dict:
    return {"id": node_id, "label": label, "type": node_type, "props": props}


def _edge(
    src: str,
    dst: str,
    rel_type: str,
    source_type: str,
    target_type: str,
    **props: Any,
) -> dict:
    return {
        "source": src,
        "target": dst,
        "type": rel_type,
        "source_type": source_type,
        "target_type": target_type,
        "props": props,
    }


def _dedupe_nodes(nodes: list[dict]) -> list[dict]:
    return list({node["id"]: node for node in nodes}.values())


def profile_to_triples(
    student_id: str, profile: StudentProfile, github: GitHubInsights | None
) -> tuple[list[dict], list[dict]]:
    nodes = [
        _node(
            student_id,
            profile.name,
            "Student",
            name=profile.name,
            cgpa=profile.cgpa or 0,
            cgpa_scale=profile.cgpa_scale,
            nationality=profile.nationality or "",
        )
    ]
    edges: list[dict] = []
    skills = list(profile.skills) + [tech for project in profile.projects for tech in project.tech]
    for skill in dict.fromkeys(skills):
        skill_id = f"skill:{slugify(skill)}"
        nodes.append(_node(skill_id, skill, "Skill", name=skill.lower()))
        edges.append(_edge(student_id, skill_id, "HAS_SKILL", "Student", "Skill", source="profile"))

    for project in profile.projects:
        project_id = f"project:{student_id}:{slugify(project.name)}"
        nodes.append(
            _node(
                project_id,
                project.name,
                "Project",
                name=project.name,
                url=project.url or "",
                stars=project.stars or 0,
            )
        )
        edges.append(_edge(student_id, project_id, "BUILT", "Student", "Project"))
        for tech in dict.fromkeys(project.tech):
            skill_id = f"skill:{slugify(tech)}"
            nodes.append(_node(skill_id, tech, "Skill", name=tech.lower()))
            edges.append(_edge(project_id, skill_id, "USES", "Project", "Skill"))
    return _dedupe_nodes(nodes), edges


def opportunity_to_triples(opportunity: Opportunity) -> tuple[list[dict], list[dict]]:
    opp = opportunity
    now = datetime.now(timezone.utc).isoformat()
    nodes = [
        _node(
            opp.id,
            opp.name,
            "Opportunity",
            name=opp.name,
            kind=opp.kind,
            funding_type=opp.funding_type,
            funding_text=opp.funding_text,
            deadline=opp.deadline.isoformat() if opp.deadline else "",
            verification=opp.verification,
            confidence=opp.confidence,
            verified_at=now,
            data_json=opp.model_dump_json(),
        )
    ]
    edges: list[dict] = []

    org_id = f"org:{slugify(opp.provider_org)}"
    nodes.append(_node(org_id, opp.provider_org, "Organization", name=opp.provider_org))
    edges.append(_edge(opp.id, org_id, "OFFERED_BY", "Opportunity", "Organization"))
    if opp.country:
        country_id = f"country:{slugify(opp.country)}"
        nodes.append(_node(country_id, opp.country, "Country", name=opp.country))
        edges.append(_edge(org_id, country_id, "LOCATED_IN", "Organization", "Country"))

    for index, requirement in enumerate(opp.requirements):
        req_id = f"{opp.id}:{requirement.key}:{index}"
        nodes.append(
            _node(
                req_id,
                requirement.description,
                "Requirement",
                key=requirement.key,
                description=requirement.description,
            )
        )
        edges.append(_edge(opp.id, req_id, "REQUIRES", "Opportunity", "Requirement"))

    for skill in dict.fromkeys(opp.valued_skills):
        skill_id = f"skill:{slugify(skill)}"
        nodes.append(_node(skill_id, skill, "Skill", name=skill.lower()))
        edges.append(_edge(opp.id, skill_id, "VALUES", "Opportunity", "Skill"))

    for source in opp.sources:
        nodes.append(_node(source.url, source.url, "Source", url=source.url, quote=source.quote))
        edges.append(_edge(opp.id, source.url, "SOURCED_FROM", "Opportunity", "Source"))
    return _dedupe_nodes(nodes), edges


def eligibility_edges(student_id: str, opportunity: Opportunity) -> list[dict]:
    edges: list[dict] = []
    for index, requirement in enumerate(opportunity.requirements):
        req_id = f"{opportunity.id}:{requirement.key}:{index}"
        rel = {"yes": "MEETS", "no": "MISSES"}.get(requirement.met, "UNKNOWN")
        edges.append(_edge(student_id, req_id, rel, "Student", "Requirement", evidence=requirement.evidence))
    edges.append(
        _edge(
            student_id,
            opportunity.id,
            "MATCHED",
            "Student",
            "Opportunity",
            score=opportunity.score,
            eligibility=opportunity.eligibility,
        )
    )
    return edges


def _display(node: Any) -> str:
    props = dict(node)
    for key in ("name", "description", "url"):
        if props.get(key):
            return str(props[key])
    labels = list(getattr(node, "labels", []) or [])
    return labels[0] if labels else "Node"


def _node_id(node: Any) -> str:
    props = dict(node)
    return str(props.get("id") or props.get("name") or props.get("url") or node.element_id)


def _path_to_list(path: Any) -> list[str]:
    parts: list[str] = []
    for index, node in enumerate(path.nodes):
        parts.append(_display(node))
        if index < len(path.relationships):
            parts.append(path.relationships[index].type.lower())
    return parts


# --------------------------------------------------------------------------- #
# Neo4j backend
# --------------------------------------------------------------------------- #
class Neo4jStore:
    def __init__(self) -> None:
        from neo4j import AsyncGraphDatabase

        self._driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password),
        )

    async def init(self) -> None:
        await self._driver.verify_connectivity()
        async with self._driver.session() as session:
            for statement in CONSTRAINTS:
                result = await session.run(statement)
                await result.consume()

    async def _write(self, query: str, **params: Any) -> None:
        async with self._driver.session() as session:
            result = await session.run(query, params)
            await result.consume()

    async def _read(self, query: str, **params: Any) -> list[Any]:
        async with self._driver.session() as session:
            result = await session.run(query, params)
            return [record async for record in result]

    async def _upsert(self, nodes: list[dict], edges: list[dict]) -> None:
        by_label: dict[str, list[dict]] = {}
        for node in nodes:
            by_label.setdefault(node["type"], []).append({"id": node["id"], **node["props"]})
        for label, rows in by_label.items():
            if not _LABEL_RE.match(label):
                continue
            await self._write(
                f"UNWIND $rows AS row MERGE (n:`{label}` {{id: row.id}}) SET n += row",
                rows=rows,
            )

        by_relation: dict[tuple[str, str, str], list[dict]] = {}
        for edge in edges:
            key = (edge["source_type"], edge["type"], edge["target_type"])
            by_relation.setdefault(key, []).append(
                {"source": edge["source"], "target": edge["target"], "props": edge["props"]}
            )
        for (source_type, rel_type, target_type), rows in by_relation.items():
            if not all(_LABEL_RE.match(value) for value in (source_type, rel_type, target_type)):
                continue
            await self._write(
                "UNWIND $rows AS row "
                f"MATCH (a:`{source_type}` {{id: row.source}}) "
                f"MATCH (b:`{target_type}` {{id: row.target}}) "
                f"MERGE (a)-[r:`{rel_type}`]->(b) SET r += row.props",
                rows=rows,
            )

    async def upsert_student(
        self, student_id: str, profile: StudentProfile, github: GitHubInsights | None
    ) -> None:
        await self._upsert(*profile_to_triples(student_id, profile, github))

    async def upsert_opportunity(self, opportunity: Opportunity) -> None:
        await self._upsert(*opportunity_to_triples(opportunity))

    async def link_eligibility(self, student_id: str, opportunity: Opportunity) -> None:
        await self._upsert([], eligibility_edges(student_id, opportunity))

    async def explain_paths(self, student_id: str, opp_id: str, limit: int = 3) -> list[list[str]]:
        records = await self._read(EXPLAIN_PATHS, sid=student_id, oid=opp_id, limit=limit)
        return [_path_to_list(record["p"]) for record in records if record.get("p")]

    async def recent_opportunities(self, countries: list[str], days: int = 14) -> list[Opportunity]:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        records = await self._read(RECENT_OPPORTUNITIES, countries=countries, cutoff=cutoff)
        found: dict[str, Opportunity] = {}
        for record in records:
            raw = record.get("data")
            if not raw:
                continue
            try:
                opportunity = Opportunity.model_validate_json(raw)
            except ValueError:
                continue
            found[opportunity.id] = opportunity
        return list(found.values())

    async def export(self, student_id: str) -> dict:
        nodes: dict[str, dict] = {}
        links: dict[tuple[str, str, str], dict] = {}
        for query in (EXPORT_STUDENT, EXPORT_MATCHED):
            for record in await self._read(query, sid=student_id):
                left, relation, right = record.get("s") or record.get("o"), record.get("r"), record.get("n")
                if left is None or relation is None or right is None:
                    continue
                for node in (left, right):
                    node_id = _node_id(node)
                    nodes[node_id] = {
                        "id": node_id,
                        "label": _display(node),
                        "type": (list(node.labels) or ["Node"])[0],
                    }
                links[(relation.start_node.element_id, relation.end_node.element_id, relation.type)] = {
                    "source": _node_id(relation.start_node),
                    "target": _node_id(relation.end_node),
                    "type": relation.type,
                }
        return {"nodes": list(nodes.values())[:300], "links": list(links.values())[:300]}

    async def close(self) -> None:
        await self._driver.close()


# --------------------------------------------------------------------------- #
# In-memory backend
# --------------------------------------------------------------------------- #
_memory_graph = nx.MultiDiGraph()


class MemoryStore:
    async def init(self) -> None:
        return None

    def _upsert(self, nodes: list[dict], edges: list[dict]) -> None:
        for node in nodes:
            _memory_graph.add_node(node["id"], label=node["label"], type=node["type"], **node["props"])
        for edge in edges:
            _memory_graph.add_edge(
                edge["source"],
                edge["target"],
                key=edge["type"],
                type=edge["type"],
                **edge["props"],
            )

    async def upsert_student(
        self, student_id: str, profile: StudentProfile, github: GitHubInsights | None
    ) -> None:
        self._upsert(*profile_to_triples(student_id, profile, github))

    async def upsert_opportunity(self, opportunity: Opportunity) -> None:
        self._upsert(*opportunity_to_triples(opportunity))

    async def link_eligibility(self, student_id: str, opportunity: Opportunity) -> None:
        self._upsert([], eligibility_edges(student_id, opportunity))

    def _skills_for_student(self, student_id: str) -> set[str]:
        skills: set[str] = set()
        for _, target, data in _memory_graph.out_edges(student_id, data=True):
            if data.get("type") == "HAS_SKILL":
                skills.add(target)
            elif data.get("type") == "BUILT":
                for _, skill, project_edge in _memory_graph.out_edges(target, data=True):
                    if project_edge.get("type") == "USES":
                        skills.add(skill)
        return skills

    def _project_for_skill(self, student_id: str, skill: str) -> str | None:
        for _, project, data in _memory_graph.out_edges(student_id, data=True):
            if data.get("type") == "BUILT" and _memory_graph.has_edge(project, skill, "USES"):
                return project
        return None

    async def explain_paths(self, student_id: str, opp_id: str, limit: int = 3) -> list[list[str]]:
        if student_id not in _memory_graph or opp_id not in _memory_graph:
            return []
        opp_skills = {
            target for _, target, data in _memory_graph.out_edges(opp_id, data=True) if data.get("type") == "VALUES"
        }
        paths: list[list[str]] = []
        for skill in sorted(self._skills_for_student(student_id) & opp_skills):
            project = self._project_for_skill(student_id, skill)
            if project:
                paths.append(
                    [
                        _memory_graph.nodes[student_id]["label"],
                        "built",
                        _memory_graph.nodes[project]["label"],
                        "uses",
                        _memory_graph.nodes[skill]["label"],
                        "valued by",
                        _memory_graph.nodes[opp_id]["label"],
                    ]
                )
            else:
                paths.append(
                    [
                        _memory_graph.nodes[student_id]["label"],
                        "has skill",
                        _memory_graph.nodes[skill]["label"],
                        "valued by",
                        _memory_graph.nodes[opp_id]["label"],
                    ]
                )
            if len(paths) >= limit:
                break
        return paths

    async def recent_opportunities(self, countries: list[str], days: int = 14) -> list[Opportunity]:
        return []

    async def export(self, student_id: str) -> dict:
        if student_id not in _memory_graph:
            return {"nodes": [], "links": []}
        view = nx.ego_graph(_memory_graph, student_id, radius=2, undirected=True)
        nodes = [
            {"id": node, "label": data.get("label", node), "type": data.get("type", "Node")}
            for node, data in view.nodes(data=True)
        ][:300]
        kept = {node["id"] for node in nodes}
        links = [
            {"source": source, "target": target, "type": data.get("type", "")}
            for source, target, key, data in view.edges(keys=True, data=True)
            if source in kept and target in kept
        ][:300]
        return {"nodes": nodes, "links": links}

    async def close(self) -> None:
        return None


# --------------------------------------------------------------------------- #
# Selection
# --------------------------------------------------------------------------- #
_neo4j_store: Neo4jStore | None = None
_neo4j_failed = False


async def get_graph_store(ctx: "AgentCtx") -> GraphStore:
    """Neo4j with a visible fallback to the in-memory graph."""
    global _neo4j_store, _neo4j_failed
    if _neo4j_store is not None:
        return _neo4j_store
    if ctx.chaos.get("graph_db_down"):
        # Demonstrate the recovery even when Neo4j was never configured.
        await maybe_fail(ctx.run_id, ctx.chaos, "graph.neo4j")
    if _neo4j_failed or not settings.configured("neo4j"):
        return MemoryStore()
    try:
        await maybe_fail(ctx.run_id, ctx.chaos, "graph.neo4j")
        candidate = Neo4jStore()
        await candidate.init()
        _neo4j_store = candidate
        return candidate
    except Exception as error:  # noqa: BLE001 - graph must never block a run
        _neo4j_failed = True
        await emit(
            ctx.run_id,
            "fallback",
            f"Neo4j unavailable ({error}); using the in-memory graph",
            ctx.agent,
            error=str(error),
        )
        return MemoryStore()


async def open_readonly_store() -> GraphStore:
    """Backend selection for the UI/API (no events, no chaos)."""
    global _neo4j_store, _neo4j_failed
    if _neo4j_store is not None:
        return _neo4j_store
    if _neo4j_failed or not settings.configured("neo4j"):
        return MemoryStore()
    try:
        candidate = Neo4jStore()
        await candidate.init()
        _neo4j_store = candidate
        return candidate
    except Exception:  # noqa: BLE001
        _neo4j_failed = True
        return MemoryStore()


async def close_graph_store() -> None:
    global _neo4j_store
    if _neo4j_store is not None:
        await _neo4j_store.close()
        _neo4j_store = None
