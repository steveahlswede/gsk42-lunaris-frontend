import { renderToStaticMarkup } from "react-dom/server";
import { getCitationFilePath } from "../../api";
import "./answerparser.css";

type HtmlParsedAnswer = {
    answerHtml: string;
    citations: string[];
};

export function parseAnswerToHtml(answer: string, isStreaming: boolean, onCitationClicked: (citationFilePath: string) => void): HtmlParsedAnswer {
    const citations: string[] = [];

    // Trim any whitespace from the end of the answer after removing follow-up questions
    let parsedAnswer = answer.trim();

    // Omit a citation that is still being typed during streaming
    if (isStreaming) {
        let lastIndex = parsedAnswer.length;
        for (let i = parsedAnswer.length - 1; i >= 0; i--) {
            if (parsedAnswer[i] === "]") {
                break;
            } else if (parsedAnswer[i] === "[") {
                lastIndex = i;
                break;
            }
        }
        const truncatedAnswer = parsedAnswer.substring(0, lastIndex);
        parsedAnswer = truncatedAnswer;
    }

    // Regex to match code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]+?)\n```/g;
    let match;
    const fragments: string[] = [];
    let lastIndex = 0;

    while ((match = codeBlockRegex.exec(parsedAnswer)) !== null) {
        const [fullMatch, language, codeContent] = match;

        // Push text before the code block as a normal fragment
        if (match.index > lastIndex) {
            fragments.push(parsedAnswer.slice(lastIndex, match.index));
        }

        const languageClass = language ? `language-${language}` : "language-none";
        const displayLanguage = language || "Text";

        // Generate a unique ID for the code block
        const codeId = `code-block-${Math.random().toString(36).substr(2, 9)}`;

        // Wrap the code content in a <pre><code> block with the appropriate language class
        const codeBlock = renderToStaticMarkup(
            <div className="code-container">
                <div className="code-header">
                    <span className="code-language">{displayLanguage}</span>
                    <button className="copy-button" data-clipboard-target={`#${codeId}`}>
                        Copy
                    </button>
                </div>
                <pre>
                    <code id={codeId} className={languageClass}>
                        {codeContent.trim()}
                    </code>
                </pre>
            </div>
        );

        fragments.push(codeBlock);

        lastIndex = codeBlockRegex.lastIndex;
    }

    // Push any remaining text after the last code block
    if (lastIndex < parsedAnswer.length) {
        fragments.push(parsedAnswer.slice(lastIndex));
    }

    // Handle citations within the text
    const finalFragments = fragments.map(fragment => {
        return fragment
            .split(/\[([^\]]+)\]/g)
            .map((part, index) => {
                if (index % 2 === 0) {
                    return part; // Regular text
                } else {
                    let citationIndex: number;
                    if (citations.indexOf(part) !== -1) {
                        citationIndex = citations.indexOf(part) + 1;
                    } else {
                        citations.push(part);
                        citationIndex = citations.length;
                    }

                    const path = getCitationFilePath(part);

                    return renderToStaticMarkup(
                        <a className="supContainer" title={part} onClick={() => onCitationClicked(path)}>
                            <sup>{citationIndex}</sup>
                        </a>
                    );
                }
            })
            .join("");
    });

    return {
        answerHtml: finalFragments.join(""),
        citations
    };
}
