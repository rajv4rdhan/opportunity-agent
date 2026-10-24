"""DEV ONLY: an OpenAI-compatible mock LLM for end-to-end tests without credits.

Run:  python scripts/dev_mock_llm.py        (listens on http://127.0.0.1:9100/v1)
Then: LLM_API_BASE=http://127.0.0.1:9100/v1 uvicorn app.main:app --port 8000
"""

from __future__ import annotations

import json
import re
import time
from hashlib import sha256
from urllib.parse import urlparse
from uuid import uuid4

import uvicorn
from fastapi import FastAPI, Request

app = FastAPI(title="ScholarSwarm mock LLM")

PROFILE = {
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "nationality": "India",
    "current_degree": "B.Tech",
    "major": "Computer Science and Engineering",
    "university": "Lovely Professional University",
    "graduation_year": 2027,
    "cgpa": 8.2,
    "cgpa_scale": 10.0,
    "work_experience_years": 0.5,
    "skills": ["python", "pytorch", "fastapi", "sql", "docker", "nlp"],
    "projects": [
        {
            "name": "RAG Chatbot for Course Notes",
            "description": "Retrieval-augmented chatbot over 4,000 pages of notes with FAISS and FastAPI.",
            "tech": ["python", "pytorch", "faiss", "fastapi"],
            "source": "resume",
        },
        {
            "name": "Resume Parser",
            "description": "Transformer-based extraction of education and skills from resumes.",
            "tech": ["python", "pytorch"],
            "source": "resume",
        },
    ],
    "achievements": ["Runner-up, Smart India Hackathon 2025"],
    "publications": [],
    "test_scores": {"ielts": None, "toefl": None, "pte": None, "duolingo": None, "gre": None, "gmat": None},
    "target_degree": "MS",
    "target_fields": ["Computer Science", "Artificial Intelligence"],
    "target_countries": ["Canada", "Germany", "Singapore"],
    "budget_inr_per_year": 1500000,
    "github_url": "https://github.com/karpathy",
    "notes": "Prefers fully funded programs.",
}

INSIGHTS = {
    "username": "karpathy",
    "public_repos": 100,
    "followers": 100000,
    "top_languages": {"Python": 100000},
    "notable_repos": [],
    "inferred_skills": ["python", "pytorch", "deep learning"],
    "hidden_gems": ["nanoGPT"],
    "activity_summary": "Mostly Python repositories focused on deep learning.",
    "strength_summary": "Strong applied machine-learning portfolio with reproducible open-source work.",
}

PLANNER = {
    "tasks": [
        {
            "query": "fully funded MS computer science scholarship Germany 2027",
            "country": "Germany",
            "kind": "scholarship",
            "rationale": "Government and university funding in a target country.",
        },
        {
            "query": "DAAD scholarship computer science masters 2027",
            "country": "Germany",
            "kind": "scholarship",
            "rationale": "National funding scheme for international students.",
        },
        {
            "query": "funded MSc artificial intelligence Canada 2027",
            "country": "Canada",
            "kind": "program",
            "rationale": "Thesis-based programs often include funding.",
        },
        {
            "query": "Singapore PhD fellowship artificial intelligence 2027",
            "country": "Singapore",
            "kind": "fellowship",
            "rationale": "Research fellowships in the third target country.",
        },
    ],
    "strategy_note": "Searching government schemes and funded university programs in all three target countries.",
}

SOP_PARAGRAPH = (
    "My interest in machine learning began with a practical problem: course notes were too large to "
    "search during exam preparation. I built a retrieval-augmented chatbot over four thousand pages, "
    "learned how embedding quality changes answer quality, and reduced response latency from six "
    "seconds to 1.2 seconds with caching. That project taught me that useful systems come from careful "
    "measurement rather than from model size alone. I followed it with a resume parser that reached "
    "ninety-one percent field-level accuracy on a five-hundred-document test set, and an internship "
    "where I shipped a document classifier to a support team. These experiences connect my coursework "
    "in algorithms, databases and machine learning to problems that people actually have."
)


def _opportunity(user: str) -> dict:
    match = re.search(r"PAGE URL:\s*(\S+)", user)
    url = match.group(1) if match else "https://example.edu/scholarship"
    domain = urlparse(url).netloc or "example.edu"
    digest = sha256(domain.encode()).hexdigest()
    funding = ["full", "partial", "tuition_waiver"][int(digest[:2], 16) % 3]
    deadline = ["2027-01-15", "2027-03-01", "2027-06-30"][int(digest[2:4], 16) % 3]
    country = (
        "Germany"
        if domain.endswith(".de")
        else "Canada"
        if domain.endswith(".ca")
        else "United Kingdom"
        if domain.endswith(".uk")
        else "United States"
    )
    page = user.split("PAGE TEXT:", 1)[1] if "PAGE TEXT:" in user else ""
    quote = " ".join(page.split()[:24]) or "Applications are open for this scholarship program."
    name = f"Mock Scholarship at {domain}"
    return {
        "id": re.sub(r"[^a-z0-9]+", "-", domain.lower()).strip("-"),
        "name": name,
        "provider_org": domain,
        "country": country,
        "kind": "scholarship",
        "degree_levels": ["MS", "PhD"],
        "fields": ["Computer Science", "Artificial Intelligence"],
        "funding_type": funding,
        "funding_text": f"{funding.replace('_', ' ').title()} funding for international students.",
        "deadline": deadline,
        "deadline_text": f"Applications close on {deadline}.",
        "requirements": [
            {
                "key": "min_gpa",
                "description": "Minimum GPA of 3.0/4.0",
                "numeric_value": 3.0,
                "numeric_scale": 4.0,
                "met": "unknown",
                "evidence": "",
                "quote": quote,
            },
            {
                "key": "english_test",
                "description": "IELTS 6.5 overall",
                "numeric_value": 6.5,
                "test_name": "IELTS",
                "met": "unknown",
                "evidence": "",
                "quote": quote,
            },
        ],
        "required_documents": ["Transcript", "Resume", "Statement of purpose"],
        "how_to_apply": ["Create an account on the official portal", "Upload transcripts and resume", "Submit before the deadline"],
        "application_url": url,
        "official_url": url,
        "sources": [
            {
                "url": url,
                "quote": quote,
                "fetch_method": "jina",
                "fetched_at": "2026-01-01T00:00:00Z",
            }
        ],
        "valued_skills": ["Python", "Machine Learning", "PyTorch"],
        "verification": "unverified",
        "confidence": 0.9,
        "is_expired": False,
    }


def _content(system: str, user: str) -> str:
    if "Profile Analyst" in system:
        profile = dict(PROFILE)
        if re.search(r'"target_countries"\s*:\s*\[\s*\]', user):
            profile.update({"target_countries": [], "target_fields": [], "target_degree": None})
        if re.search(r'"github_url"\s*:\s*""', user):
            profile["github_url"] = None
        return json.dumps(profile)
    if "GitHub Enricher" in system:
        return json.dumps(INSIGHTS)
    if "You are the Planner" in system:
        return json.dumps(PLANNER)
    if "You are the Verifier" in system:
        return json.dumps(
            {
                "is_relevant": True,
                "reason": "The page describes a current scholarship.",
                "opportunity": _opportunity(user),
                "official_url": None,
            }
        )
    if "You are the Ranker" in system:
        return json.dumps(
            {
                "why_it_fits": (
                    "You have built retrieval and deep-learning projects with Python and PyTorch, which "
                    "this program explicitly values. The funding is strong, the deadline leaves enough "
                    "time to prepare documents, and your GPA clears the stated threshold. Your missing "
                    "IELTS score is the main gap to close."
                )
            }
        )
    if "You are the SOP Writer" in system:
        return "# Statement of Purpose\n\n" + "\n\n".join([SOP_PARAGRAPH] * 8)
    if "You are the Critic" in system:
        return json.dumps({"passed": True, "issues": []})
    return "OK"


@app.post("/v1/chat/completions")
async def chat_completions(request: Request) -> dict:
    body = await request.json()
    messages = body.get("messages", [])
    system = " ".join(
        str(message.get("content", ""))
        for message in messages
        if message.get("role") == "system"
    )
    user_parts = []
    for message in messages:
        if message.get("role") != "user":
            continue
        content = message.get("content", "")
        if isinstance(content, list):
            user_parts.append(" ".join(part.get("text", "") for part in content if isinstance(part, dict)))
        else:
            user_parts.append(str(content))
    user = "\n".join(user_parts)
    return {
        "id": f"chatcmpl-{uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": body.get("model", "mock"),
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": _content(system, user)},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 100, "completion_tokens": 100, "total_tokens": 200},
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9100, log_level="warning")
