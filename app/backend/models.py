from typing import List, Literal, Optional

import pydantic


class Overrides(pydantic.BaseModel):

    retrieval_mode: Optional[Literal["hybrid", "vectors", "text"]] = None
    semantic_ranker: Optional[bool] = None
    semantic_captions: Optional[bool] = None
    exclude_category: Optional[str] = ""
    seed: Optional[int] = None
    top: int = 3
    temperature: Optional[float] = 0.3
    minimum_search_score: Optional[float] = 0.0
    minimum_reranker_score: Optional[float] = 0.0
    prompt_template: Optional[str] = ""
    suggest_followup_questions: Optional[bool] = False
    use_oid_security_filter: Optional[bool] = False
    use_groups_security_filter: Optional[bool] = False
    use_gpt4v: Optional[bool] = False
    gpt4v_input: Optional[Literal["textAndImages", "images", "texts"]] = "textAndImages"
    vector_fields: List[Literal["embedding", "imageEmbedding", "both"]] = ["embedding"]

    @property
    def use_text_search(self) -> bool:
        return self.retrieval_mode in ["text", "hybrid", None]

    @property
    def use_vector_search(self) -> bool:
        return self.retrieval_mode in ["vectors", "hybrid", None]

    @property
    def use_semantic_ranker(self) -> bool:
        return True if self.semantic_ranker else False

    @property
    def use_semantic_captions(self) -> bool:
        return True if self.semantic_captions else False

    @property
    def send_text_to_gptvision(self) -> bool:
        return self.gpt4v_input in ["textAndImages", "texts", None]

    @property
    def send_images_to_gptvision(self) -> bool:
        return self.gpt4v_input in ["textAndImages", "images", None]
