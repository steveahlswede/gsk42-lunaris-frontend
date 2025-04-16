import { ChatAppResponse } from "../api";
import { marked } from "marked";

export async function downloadSentFile(response: Response) {
    const wordFile = await response.blob();
    const fileURL = window.URL.createObjectURL(wordFile);
    const _filename = response.headers.get("content-disposition")?.split("filename=")[1];
    if (_filename) {
        const filename = _filename.replace(/"/g, "");
        const link = document.createElement("a");
        link.href = fileURL;
        link.download = filename;
        link.click();

        window.URL.revokeObjectURL(fileURL);
    }
}

export async function convertToFileEndpoint(htmlString: string, fileType: string) {
    const acceptedFileTypes = ["word", "excel"];
    if (!acceptedFileTypes.includes(fileType)) {
        throw new Error(`Given file type: '${fileType}' not valid or supported`);
    }
    const response = await fetch(`/convert_to_${fileType}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            html: htmlString
        })
    });

    if (!response.ok) {
        throw new Error(`Converting to ${fileType} doc failed: ${response.statusText}`);
    }

    return response;
}

export async function deleteDownloadedFileFromServer(endpoint: string) {
    const response = await fetch(`/${endpoint}`, { method: "GET" });

    if (!response.ok) {
        throw new Error(`Deleting file failed: ${response.statusText}`);
    }

    return response;
}

export const exportFile = async (htmlString: string, fileType: string) => {
    const response = await convertToFileEndpoint(htmlString, fileType);
    await downloadSentFile(response);
    const deletedResponse = await deleteDownloadedFileFromServer(`delete_${fileType}_file`);
    if (deletedResponse.ok) {
        console.log(`Deleted ${fileType} file after downloading`);
    } else {
        console.log(`Failed to delete ${fileType} file after downloading`);
    }
};

export const onExportWord = async (answer: ChatAppResponse) => {
    const htmlString = marked.parse(answer.message.content) as string;
    await exportFile(htmlString, "word");
};

export const onExportExcel = async (answer: ChatAppResponse) => {
    var htmlString: string;
    // had bugs where the LLM returns html code instead of markdown and thus needs to be pre-processed differently
    if (answer.message.content.includes("```")) {
        htmlString = answer.message.content;
    } else {
        htmlString = marked.parse(answer.message.content) as string;
    }
    await exportFile(htmlString, "excel");
};
