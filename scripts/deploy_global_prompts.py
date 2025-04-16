import asyncio
import os
import time
import uuid
from dataclasses import dataclass
from typing import Union

from azure.cosmos.aio import CosmosClient
from azure.identity.aio import AzureDeveloperCliCredential, ManagedIdentityCredential


@dataclass
class GlobalPrompt:
    id: str
    title: str
    prompt: str
    _ts: int
    source: str = "global"


prompts = [
    GlobalPrompt(
        title="Professionelle E-Mail",
        prompt="""Bitte erstelle aus den folgenden Punkten eine professionelle E-Mail: [Stichpunkte einfügen].
Die E-Mail soll höflich, präzise und leicht verständlich sein und sich an [Adressatengruppe einfügen] richten.
Achte auf eine gut strukturierte Darstellung mit aussagekräftiger Betreffzeile sowie einem klaren Aufbau (Grußformel, Einleitung, Hauptteil mit den wesentlichen Informationen, Schluss, Grußformel). Die Tonalität soll dem Anlass entsprechend formell, aber dennoch zugänglich und freundlich sein.
""",
        _ts=int(time.time()),
        id=str(uuid.uuid4()),
    ),
    GlobalPrompt(
        title="Übersetzung",
        prompt="""Bitte übersetze den folgenden Text ins [Zielsprache einfügen]. Achte auf eine präzise, flüssige und professionelle Ausdrucksweise, wie sie in geschäftlichen oder förmlichen Kontexten üblich ist. 

Erhalte dabei den inhaltlichen Kern des Originals und passe ggf. sprachliche Nuancen oder idiomatische Wendungen an, um ein stimmiges und kulturell angemessenes Resultat zu erzielen:

[Text]
""",
        _ts=int(time.time()),
        id=str(uuid.uuid4()),
    ),
    GlobalPrompt(
        title="Rechtschreib-, Grammatik- und Stilkorrekturen",
        prompt="""Bitte prüfe den folgenden juristischen Text auf Rechtschreib-, Grammatik- und Stilfehler.

 Wenn möglich, mache konkrete Vorschläge zur Verbesserung der Satzstruktur, des Ausdrucks und der Verständlichkeit, ohne dabei die inhaltliche Logik zu verfälschen. Achte darauf, dass der Text weiterhin präzise und fachlich einwandfrei bleibt und die formalen Anforderungen juristischer Dokumente erfüllt:

[Text einfügen]
""",
        _ts=int(time.time()),
        id=str(uuid.uuid4()),
    ),
    GlobalPrompt(
        title="Dokumentenanalyse -> Tabelle",
        prompt="""Bitte analysiere das angehängte Dokument und fasse die zehn wichtigsten Punkte strukturiert und verständlich zusammen. Identifiziere darüber hinaus die darin beschriebenen Hauptprobleme oder Herausforderungen. Achte auf eine prägnante Darstellung, die deutlich macht, warum diese Punkte relevant sind und wo die zentralen Problemstellen liegen. Berücksichtige alle wesentlichen Aspekte, ohne zu stark zu kürzen, damit der Kontext erhalten bleibt.
Gib mir den Output in einer Tabelle aus.
""",
        _ts=int(time.time()),
        id=str(uuid.uuid4()),
    ),
    GlobalPrompt(
        title="Strukturierter Vortrag mit Kernaussagen",
        prompt="""Ich bereite einen [Anzahl der Minuten]-minütigen Vortrag über das Thema [Thema einfügen] vor. Bitte schlage mir eine sinnvolle Gliederung für den Vortrag vor und nenne mir zu jedem Gliederungspunkt die [Anzahl] wichtigsten Aussagen, die ich unbedingt ansprechen sollte.
Achte darauf, dass die einzelnen Abschnitte zeitlich realistisch geplant sind und sich logisch aneinanderfügen (z. B. Einleitung, Hauptteil mit Unterpunkten, Schluss).
Hinweise zur Vertiefung einzelner Aspekte oder zur Einbindung von Beispielen und praktischen Anwendungen sind ebenfalls willkommen.
""",
        _ts=int(time.time()),
        id=str(uuid.uuid4()),
    ),
    GlobalPrompt(
        title="Rhetorische und inhaltliche Hilfe",
        prompt="""Ich habe diese Rede verfasst, die sich an [Zielgruppe] richtet und das Ziel verfolgt, [Zielbeschreibung].
Bitte analysiere den gesamten Redetext und identifiziere mögliche Schwächen in der Argumentation, insbesondere unklare Formulierungen, fehlende Belege oder logische Brüche. Zeige auf, wie diese Punkte die Überzeugungskraft der Rede beeinflussen könnten und mache, wo sinnvoll, konkrete Verbesserungsvorschläge.
""",
        _ts=int(time.time()),
        id=str(uuid.uuid4()),
    ),
    GlobalPrompt(
        title="Mediation & Kompromissfindung",
        prompt="""Du agierst als neutraler Mediator für unser Unternehmen. Der vorliegende Konflikt lautet: [Konfliktbeschreibung].
Bitte analysiere die Sichtweisen und Interessen beider Seiten [Parteien]
Finde einen Kompromissvorschlag, der für beide Parteien akzeptabel und versöhnlich ist. Berücksichtige dabei mögliche Ursachen, bestehende Machtverhältnisse und emotionale Aspekte. Gib außerdem Hinweise, wie der vorgeschlagene Kompromiss praktisch umgesetzt werden könnte, um eine nachhaltige Lösung zu erreichen.
""",
        _ts=int(time.time()),
        id=str(uuid.uuid4()),
    ),
    GlobalPrompt(
        title="Social-Media-Beitrag",
        prompt="""Bitte erstelle einen überzeugenden und professionellen LinkedIn-Beitrag, der unser neues Beratungsangebot im Bereich [Themengebiet] vorstellt.
Hebe dabei besonders hervor, dass unsere Beratung die Aspekte [Aspekte aufzählen] umfasst und erläutere, wie diese für unsere Mandanten einen Mehrwert schaffen.
Achte auf eine prägnante, aber dennoch freundliche Tonalität, verwende ggf. kurze Stichpunkte oder Absätze zur besseren Lesbarkeit und schließe den Beitrag mit einem klaren Call to Action ab, z. B. einer Einladung zum Gespräch oder Link zu weiteren Informationen. Der Beitrag sollte außerdem optisch ansprechend formatiert sein (z. B. durch Absätze und passende Emojis oder grafische Elemente), um auf LinkedIn eine hohe Aufmerksamkeit zu erzeugen.
""",
        _ts=int(time.time()),
        id=str(uuid.uuid4()),
    ),
]


def get_creds():
    AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID")
    azure_credential: Union[AzureDeveloperCliCredential, ManagedIdentityCredential]
    if os.getenv("WEBSITE_HOSTNAME"):  # Environment variable set on Azure Web Apps
        azure_credential = ManagedIdentityCredential()
    elif AZURE_TENANT_ID:
        azure_credential = AzureDeveloperCliCredential(tenant_id=AZURE_TENANT_ID, process_timeout=60)
    else:
        azure_credential = AzureDeveloperCliCredential(process_timeout=60)
    return azure_credential


async def main():
    if not os.getenv("DATABASE_NAME"):
        raise ValueError("DATABASE_NAME is not set")
    if not os.getenv("CONTAINER_NAME_GLOBAL_PROMPTS"):
        raise ValueError("CONTAINER_NAME_GLOBAL_PROMPTS is not set")
    if not os.getenv("COSMOS_ACCOUNT_NAME"):
        raise ValueError("COSMOS_ACCOUNT_NAME is not set")

    azure_credential = get_creds()
    print(os.environ["COSMOS_ACCOUNT_NAME"])
    print(os.environ["CONTAINER_NAME_GLOBAL_PROMPTS"])
    print(os.environ["DATABASE_NAME"])
    db_name = os.environ["COSMOS_ACCOUNT_NAME"]
    chat_history_client = CosmosClient(url=f"https://{db_name}.documents.azure.com:443/", credential=azure_credential)
    database_obj = chat_history_client.get_database_client(os.environ["DATABASE_NAME"])
    container = database_obj.get_container_client(os.environ["CONTAINER_NAME_GLOBAL_PROMPTS"])
    for prompt in prompts:
        item = await container.upsert_item(body=prompt.__dict__)
        print(item)
    return item


if __name__ == "__main__":
    asyncio.run(main())
