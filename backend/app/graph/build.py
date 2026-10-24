"""LangGraph assembly for the ScholarSwarm."""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from app.agents.clarifier import clarifier
from app.agents.critic import critic
from app.agents.finalizer import finalizer
from app.agents.github_enricher import github_enricher
from app.agents.matcher import matcher
from app.agents.planner import planner
from app.agents.profile_analyst import profile_analyst
from app.agents.ranker import ranker
from app.agents.scout import scout
from app.agents.sop_writer import sop_writer
from app.agents.verifier import verifier
from app.graph.routing import (
    critic_supervisor,
    fan_out_verifiers,
    matcher_supervisor,
    next_node,
    profile_supervisor,
)
from app.models.state import SwarmState


def build_graph(checkpointer: Any = None):
    builder = StateGraph(SwarmState)

    builder.add_node("profile_analyst", profile_analyst)
    builder.add_node("profile_supervisor", profile_supervisor)
    builder.add_node("clarifier", clarifier)
    builder.add_node("github_enricher", github_enricher)
    builder.add_node("planner", planner)
    builder.add_node("scout", scout)
    builder.add_node("verifier", verifier)
    builder.add_node("matcher", matcher)
    builder.add_node("matcher_supervisor", matcher_supervisor)
    builder.add_node("ranker", ranker)
    builder.add_node("sop_writer", sop_writer)
    builder.add_node("critic", critic)
    builder.add_node("critic_supervisor", critic_supervisor)
    builder.add_node("finalizer", finalizer)

    builder.add_edge(START, "profile_analyst")
    builder.add_edge("profile_analyst", "profile_supervisor")
    builder.add_conditional_edges(
        "profile_supervisor",
        next_node,
        {"clarifier": "clarifier", "github_enricher": "github_enricher", "end": END},
    )
    builder.add_edge("clarifier", "github_enricher")
    builder.add_edge("github_enricher", "planner")
    builder.add_edge("planner", "scout")
    builder.add_conditional_edges("scout", fan_out_verifiers)
    builder.add_edge("verifier", "matcher")
    builder.add_edge("matcher", "matcher_supervisor")
    builder.add_conditional_edges(
        "matcher_supervisor",
        next_node,
        {"planner": "planner", "ranker": "ranker", "end": END},
    )
    builder.add_edge("ranker", "sop_writer")
    builder.add_edge("sop_writer", "critic")
    builder.add_edge("critic", "critic_supervisor")
    builder.add_conditional_edges(
        "critic_supervisor",
        next_node,
        {"sop_writer": "sop_writer", "finalizer": "finalizer"},
    )
    builder.add_edge("finalizer", END)

    return builder.compile(checkpointer=checkpointer)
