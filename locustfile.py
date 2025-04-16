import random
import time

from locust import HttpUser, between, task


class ChatUser(HttpUser):
    wait_time = between(5, 20)

    @task
    def ask_question(self):
        self.client.get("/")
        time.sleep(5)
        self.client.post(
            "/chat",
            json={
                "messages": [
                    {
                        "content": random.choice(
                            [
                                "What is included in my Northwind Health Plus plan that is not in standard?",
                                "What does a Product Manager do?",
                                "What happens in a performance review?",
                                "Whats your whistleblower policy?",
                            ]
                        ),
                        "role": "user",
                    },
                ],
                "context": {
                    "overrides": {
                        "retrieval_mode": "hybrid",
                        "semantic_ranker": True,
                        "semantic_captions": False,
                        "top": 3,
                        "suggest_followup_questions": False,
                    },
                },
            },
        )
        time.sleep(5)
        self.client.post(
            "/chat",
            json={
                "messages": [
                        {
                            "content": "Wie kann ich meine tägliche Arbeitsbelastung besser organisieren?",
                            "role": "user"
                        },
                        {
                            "content": "Um deine tägliche Arbeitsbelastung besser zu organisieren, kannst du verschiedene Ansätze ausprobieren. Erstelle eine Prioritätenliste der wichtigsten Aufgaben, verwende Zeitmanagement-Methoden wie die Pomodoro-Technik und vermeide Multitasking, um dich auf eine Aufgabe zur Zeit zu konzentrieren. Es kann auch hilfreich sein, Pausen einzuplanen und Aufgaben zu delegieren, wenn möglich.",
                            "role": "assistant"
                        },
                        {
                            "content": "Wie antworte ich am besten auf diese E-Mail?",
                            "role": "user"
                        },
                        {
                            "content": "Beim Antworten auf eine geschäftliche E-Mail ist es wichtig, klar und präzise zu sein. Bedanke dich für die Nachricht, gehe auf die gestellten Fragen oder Anliegen ein und beende die E-Mail höflich, indem du weitere Hilfe anbietest oder auf eine Antwort wartest. Beispiel: 'Vielen Dank für Ihre Nachricht. Ich werde mich um das von Ihnen angesprochene Thema kümmern und melde mich bis [Datum] bei Ihnen. Falls Sie in der Zwischenzeit Fragen haben, stehe ich Ihnen gerne zur Verfügung.'",
                            "role": "assistant"
                        },
                        {
                            "content": "Welche allgemeinen Infos gibt es zu unserem neuen Produkt?",
                            "role": "user"
                        },
                        {
                            "content": "Unser neues Produkt bietet eine Vielzahl an Funktionen, die die Produktivität steigern und die Benutzererfahrung verbessern. Es unterstützt sowohl Cloud-basierte als auch lokale Lösungen, ist skalierbar und kann nahtlos in bestehende Systeme integriert werden. Weitere Informationen findest du im beigefügten Datenblatt [product_overview.pdf].",
                            "role": "assistant"
                        }
                    ],
                    "context": {
                        "overrides": {
                            "retrieval_mode": "hybrid",
                            "semantic_ranker": "true",
                            "semantic_captions": "false",
                            "top": 3,
                            "suggest_followup_questions": "false"
                        }
                    }
                },
        )


class ChatVisionUser(HttpUser):
    wait_time = between(5, 20)

    @task
    def ask_question(self):
        self.client.get("/")
        time.sleep(5)
        self.client.post(
            "/chat/stream",
            json={
                "messages": [
                    {
                        "content": "Can you identify any correlation between oil prices and stock market trends?",
                        "role": "user",
                    }
                ],
                "context": {
                    "overrides": {
                        "top": 3,
                        "temperature": 0.3,
                        "minimum_reranker_score": 0,
                        "minimum_search_score": 0,
                        "retrieval_mode": "hybrid",
                        "semantic_ranker": True,
                        "semantic_captions": False,
                        "suggest_followup_questions": False,
                        "use_oid_security_filter": False,
                        "use_groups_security_filter": False,
                        "vector_fields": ["embedding", "imageEmbedding"],
                        "use_gpt4v": True,
                        "gpt4v_input": "textAndImages",
                    }
                },
                "session_state": None,
            },
        )
        time.sleep(5)
        self.client.post(
            "/chat/stream",
            json={
                "messages": [
                    {"content": "Compare the impact of interest rates and GDP in financial markets.", "role": "user"}
                ],
                "context": {
                    "overrides": {
                        "top": 3,
                        "temperature": 0.3,
                        "minimum_reranker_score": 0,
                        "minimum_search_score": 0,
                        "retrieval_mode": "hybrid",
                        "semantic_ranker": True,
                        "semantic_captions": False,
                        "suggest_followup_questions": False,
                        "use_oid_security_filter": False,
                        "use_groups_security_filter": False,
                        "vector_fields": ["embedding", "imageEmbedding"],
                        "use_gpt4v": True,
                        "gpt4v_input": "textAndImages",
                    }
                },
                "session_state": None,
            },
        )
