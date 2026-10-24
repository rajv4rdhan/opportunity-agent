"""Generate four fictional sample profiles (PDFs + form.json). Never overwrites."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "samples"

SAMPLES = {
    "rahul": {
        "name": "Rahul Sharma",
        "contact": "Jalandhar, India | rahul.sharma@example.com | github.com/karpathy",
        "summary": "Final-year B.Tech Computer Science student focused on applied machine learning and retrieval systems. Looking for a funded MS in Computer Science or AI.",
        "education": [
            "B.Tech Computer Science and Engineering, Lovely Professional University, 2023-2027 (expected)",
            "CGPA: 8.2 / 10",
        ],
        "skills": "Python, PyTorch, FastAPI, SQL, Docker, Git, LangChain, Retrieval-Augmented Generation",
        "projects": [
            (
                "RAG Chatbot for Course Notes",
                "Built a retrieval-augmented chatbot over 4,000 pages of course notes using sentence-transformer embeddings, FAISS and a FastAPI backend. Cut answer latency from 6s to 1.2s with caching.",
            ),
            (
                "Resume Parser",
                "Fine-tuned a small transformer to extract education, skills and experience from resumes; 91% field-level accuracy on a 500-document test set.",
            ),
        ],
        "experience": [
            "ML Intern, IndiQus Technologies (May-July 2026): built a document classification pipeline used by the support team.",
        ],
        "achievements": [
            "Runner-up, Smart India Hackathon 2025 (team of 4).",
            "Teaching assistant for the Python programming lab.",
        ],
        "courses": [
            ("Data Structures and Algorithms", "A"),
            ("Machine Learning", "A"),
            ("Database Systems", "A"),
            ("Operating Systems", "B+"),
            ("Computer Networks", "A"),
            ("Linear Algebra", "B+"),
        ],
        "form": {
            "github_url": "https://github.com/karpathy",
            "linkedin_url": "",
            "other_links": [],
            "target_countries": ["Canada", "Germany", "Singapore"],
            "target_degree": "MS",
            "target_fields": ["Computer Science", "Artificial Intelligence"],
            "nationality": "India",
            "budget_inr_per_year": 1500000,
            "test_scores": {"ielts": None, "toefl": None, "pte": None, "duolingo": None, "gre": None, "gmat": None},
            "notes": "Final-year B.Tech CSE student. Prefers funded programs; no English test score yet.",
        },
    },
    "priya": {
        "name": "Priya Nair",
        "contact": "Kochi, India | priya.nair@example.com",
        "summary": "B.Sc Biotechnology graduate with wet-lab and Python experience, seeking an MS or PhD in bioinformatics.",
        "education": [
            "B.Sc Biotechnology, University of Kerala, 2022-2025",
            "CGPA: 7.1 / 10",
        ],
        "skills": "Python, R, Biopython, BLAST, SPSS, laboratory techniques, scientific writing",
        "projects": [
            (
                "Protein Sequence Analysis Pipeline",
                "Automated BLAST queries and phylogenetic tree construction for 120 protein families using Biopython and R.",
            ),
            (
                "Antimicrobial Resistance Literature Review",
                "Systematic review of 60 papers on AMR in South Asia; co-authored a departmental report.",
            ),
        ],
        "experience": [
            "Research Assistant, Kerala State Institute of Biotechnology (Summer 2025): maintained cell cultures and analysed sequencing data.",
        ],
        "achievements": ["IELTS Academic 7.0", "Departmental merit scholarship, 2024"],
        "courses": [
            ("Molecular Biology", "A"),
            ("Biochemistry", "B+"),
            ("Microbiology", "A"),
            ("Biostatistics", "B"),
            ("Genetic Engineering", "B+"),
            ("Bioinformatics", "A"),
        ],
        "form": {
            "github_url": "",
            "linkedin_url": "",
            "other_links": [],
            "target_countries": [],
            "target_degree": "MS",
            "target_fields": ["Bioinformatics", "Biotechnology"],
            "nationality": "India",
            "budget_inr_per_year": 1000000,
            "test_scores": {"ielts": 7.0, "toefl": None, "pte": None, "duolingo": None, "gre": None, "gmat": None},
            "notes": "Open to any country. Interested in research-based MS or PhD programs.",
        },
    },
    "arjun": {
        "name": "Arjun Mehta",
        "contact": "Mumbai, India | arjun.mehta@example.com",
        "summary": "Business analyst with two years of experience in retail operations, applying for an MBA in the UK or Australia.",
        "education": [
            "B.Com (Hons), University of Mumbai, 2019-2022",
            "CGPA: 6.8 / 10",
        ],
        "skills": "Financial analysis, Excel modelling, SQL, Tableau, stakeholder communication, project management",
        "projects": [
            (
                "Retail Demand Forecast",
                "Built a store-level demand model in Excel and SQL that reduced stockouts by 12% in a pilot of 8 stores.",
            ),
        ],
        "experience": [
            "Business Analyst, Reliance Retail (2023-present): owned weekly sales reporting and supplier performance reviews.",
            "Operations Intern, Deloitte India (2022): supported a supply-chain audit engagement.",
        ],
        "achievements": ["Promoted to analyst in 14 months.", "GMAT: not taken yet."],
        "courses": [
            ("Financial Accounting", "B"),
            ("Business Statistics", "B+"),
            ("Microeconomics", "A"),
            ("Corporate Finance", "B"),
            ("Marketing Management", "B+"),
            ("Business Law", "B"),
        ],
        "form": {
            "github_url": "",
            "linkedin_url": "",
            "other_links": [],
            "target_countries": ["United Kingdom", "Australia"],
            "target_degree": "MBA",
            "target_fields": ["Business Administration"],
            "nationality": "India",
            "budget_inr_per_year": 3000000,
            "test_scores": {"ielts": None, "toefl": None, "pte": None, "duolingo": None, "gre": None, "gmat": None},
            "notes": "Two years of work experience. Needs scholarship options; GMAT not taken.",
        },
    },
    "meera": {
        "name": "Meera Iyer",
        "contact": "Chennai, India | meera.iyer@example.com | github.com/karpathy",
        "summary": "B.Tech Electronics and Communication student with a strong research record, applying for a PhD in robotics in the USA.",
        "education": [
            "B.Tech Electronics and Communication Engineering, Anna University, 2023-2027 (expected)",
            "CGPA: 9.1 / 10",
        ],
        "skills": "C++, Python, ROS2, OpenCV, PyTorch, embedded systems, SLAM, control theory",
        "projects": [
            (
                "Vision-Guided Mobile Robot",
                "Built a ROS2 robot that navigates indoor corridors using ORB-SLAM3 and a depth camera; 94% success over 50 runs.",
            ),
            (
                "Edge Gesture Recognition",
                "Deployed a quantised CNN on an ESP32-S3 for gesture recognition at 18 FPS.",
            ),
        ],
        "experience": [
            "Research Intern, IIT Madras Robotics Lab (Summer 2026): worked on multi-agent path planning.",
        ],
        "achievements": [
            "GRE 322 (Quant 168, Verbal 154); TOEFL 108.",
            "Author, 'Edge SLAM for Indoor Robots', student track, IEEE INDICON 2025.",
            "Best final-year project nominee, 2026.",
        ],
        "courses": [
            ("Signals and Systems", "A"),
            ("Digital Signal Processing", "A"),
            ("Control Systems", "A"),
            ("Robotics", "A"),
            ("Computer Vision", "A"),
            ("Probability and Random Processes", "A"),
        ],
        "form": {
            "github_url": "https://github.com/karpathy",
            "linkedin_url": "",
            "other_links": [],
            "target_countries": ["United States"],
            "target_degree": "PhD",
            "target_fields": ["Robotics", "Electrical Engineering"],
            "nationality": "India",
            "budget_inr_per_year": 4000000,
            "test_scores": {"ielts": None, "toefl": 108.0, "pte": None, "duolingo": None, "gre": 322.0, "gmat": None},
            "notes": "Research-focused; needs a fully funded PhD with an assistantship.",
        },
    },
}


def _wrap(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def write_resume(path: Path, sample: dict) -> None:
    styles = getSampleStyleSheet()
    document = SimpleDocTemplate(
        str(path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm
    )
    story = [
        Paragraph(_wrap(sample["name"]), styles["Title"]),
        Paragraph(_wrap(sample["contact"]), styles["Normal"]),
        Spacer(1, 8),
        Paragraph(_wrap(sample["summary"]), styles["Normal"]),
        Spacer(1, 10),
        Paragraph("Education", styles["Heading2"]),
    ]
    story += [Paragraph(_wrap(item), styles["Normal"]) for item in sample["education"]]
    story += [Spacer(1, 8), Paragraph("Skills", styles["Heading2"]), Paragraph(_wrap(sample["skills"]), styles["Normal"])]
    story += [Spacer(1, 8), Paragraph("Projects", styles["Heading2"])]
    for title, description in sample["projects"]:
        story.append(Paragraph(f"<b>{_wrap(title)}</b>", styles["Normal"]))
        story.append(Paragraph(_wrap(description), styles["Normal"]))
        story.append(Spacer(1, 4))
    story += [Spacer(1, 4), Paragraph("Experience", styles["Heading2"])]
    story += [Paragraph(_wrap(item), styles["Normal"]) for item in sample["experience"]]
    story += [Spacer(1, 8), Paragraph("Achievements", styles["Heading2"])]
    story += [Paragraph(_wrap(item), styles["Normal"]) for item in sample["achievements"]]
    document.build(story)


def write_transcript(path: Path, sample: dict) -> None:
    styles = getSampleStyleSheet()
    document = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm)
    rows = [["Course", "Grade"]] + [[course, grade] for course, grade in sample["courses"]]
    table = Table(rows, colWidths=[110 * mm, 30 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), "#e5e7eb"),
                ("GRID", (0, 0), (-1, -1), 0.4, "#9ca3af"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    document.build(
        [
            Paragraph(f"{_wrap(sample['name'])} - Academic Transcript", styles["Title"]),
            Paragraph(_wrap(sample["education"][0]), styles["Normal"]),
            Paragraph(_wrap(sample["education"][1]), styles["Normal"]),
            Spacer(1, 10),
            table,
        ]
    )


def main() -> int:
    created = 0
    for name, sample in SAMPLES.items():
        folder = SAMPLES_DIR / name
        folder.mkdir(parents=True, exist_ok=True)
        resume = folder / "resume.pdf"
        transcript = folder / "transcript.pdf"
        form = folder / "form.json"
        existed = {"resume": resume.exists(), "transcript": transcript.exists(), "form": form.exists()}
        if not existed["resume"]:
            write_resume(resume, sample)
            created += 1
        if not existed["transcript"]:
            write_transcript(transcript, sample)
            created += 1
        if not existed["form"]:
            form.write_text(json.dumps(sample["form"], indent=2) + "\n")
            created += 1
        status = ", ".join(f"{key}={'kept' if kept else 'new'}" for key, kept in existed.items())
        print(f"{name}: {status}")
    print(f"done ({created} file(s) created)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
