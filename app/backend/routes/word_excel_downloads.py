import os

from docx import Document
from htmldocx import HtmlToDocx
from quart import Blueprint, jsonify, request, send_file
from tablepyxl import tablepyxl

docs_bp = Blueprint("docs", __name__)

WORD_FILE_NAME = "./answer.docx"
EXCEL_FILE_NAME = "./table.xlsx"


@docs_bp.post("/convert_to_word")
async def convert_to_word():
    request_json = await request.get_json()
    html_string = request_json.get("html")
    document = Document()
    new_parser = HtmlToDocx()
    new_parser.add_html_to_document(html_string, document)
    document.save(WORD_FILE_NAME)
    return await send_file(WORD_FILE_NAME, as_attachment=True)


@docs_bp.post("/convert_to_excel")
async def convert_to_excel():
    request_json = await request.get_json()
    table_string = request_json.get("html")
    tablepyxl.document_to_xl(table_string, EXCEL_FILE_NAME)
    return await send_file(EXCEL_FILE_NAME, as_attachment=True)


def handle_delete(file_name):
    if os.path.exists(file_name):
        os.remove(file_name)
        return jsonify({"message": "File deleted successfully"}), 200
    return jsonify({"message": "File not found"}), 404


@docs_bp.get("/delete_word_file")
async def delete_word_file():
    return handle_delete(WORD_FILE_NAME)


@docs_bp.get("/delete_excel_file")
async def delete_excel_file():
    return handle_delete(EXCEL_FILE_NAME)
