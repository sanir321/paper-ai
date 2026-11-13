import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from fpdf import FPDF, XPos, YPos

# ══════════════════════════════════════════════════════════════════════════════
# DOCX HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════
def set_cell_shading(cell, color_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_table_borders(table, color="D0D5DD", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    tblBorders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(tblBorders)

def add_p(doc, text="", space_before=0, space_after=6, line_spacing=1.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False, font_size=12, color=(0,0,0)):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    p.alignment = align
    if text:
        r = p.add_run(text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(font_size)
        r.font.bold = bold
        r.font.italic = italic
        r.font.color.rgb = RGBColor(*color)
    return p

def add_ch_head(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(20)
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.line_spacing = 1.2
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(16)
    r.font.bold = True
    return p

def add_sec_head(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.2
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(14)
    r.font.bold = True
    return p

def add_subsec_head(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.2
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(12)
    r.font.bold = True
    return p

def add_code(doc, code_str):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, "F8F9FA")
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(code_str)
    r.font.name = "Consolas"
    r.font.size = Pt(9)
    r.font.color.rgb = RGBColor(30, 30, 30)
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(6)

# ══════════════════════════════════════════════════════════════════════════════
# PDF GENERATOR CLASS
# ══════════════════════════════════════════════════════════════════════════════
class ComprehensiveAcademicPDF(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_left_margin(31.75) # 1.25 in binding
        self.set_right_margin(25.4) # 1.0 in
        self.set_top_margin(25.4)   # 1.0 in
        self.set_auto_page_break(auto=True, margin=25.4)

    def header(self):
        if self.page_no() > 2:
            self.set_font('Times', 'I', 8.5)
            self.set_text_color(110, 110, 110)
            self.cell(0, 7, 'DocOct: Intelligent Document Synthesis & IEEE/ATS Generator', 0, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='R')
            self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
            self.ln(2.5)

    def footer(self):
        if self.page_no() > 1:
            self.set_y(-18)
            self.set_font('Times', '', 9.5)
            self.set_text_color(70, 70, 70)
            self.cell(0, 10, str(self.page_no()), 0, 0, 'C')

    def ch_title(self, title):
        self.set_font('Times', 'B', 14.5)
        self.set_text_color(0, 0, 0)
        self.multi_cell(0, 6.5, title, align='L', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(3.5)

    def sec_title(self, title):
        self.set_font('Times', 'B', 12.5)
        self.set_text_color(0, 0, 0)
        self.multi_cell(0, 6, title, align='L', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2.5)

    def subsec_title(self, title):
        self.set_font('Times', 'B', 11)
        self.set_text_color(0, 0, 0)
        self.multi_cell(0, 5.5, title, align='L', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def body_p(self, text):
        self.set_font('Times', '', 10.5)
        self.set_text_color(20, 20, 20)
        self.multi_cell(0, 5.5, text, align='J', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def bullet(self, bold_prefix, text):
        w_avail = self.w - self.l_margin - self.r_margin
        full = f"   -   {bold_prefix} {text}" if bold_prefix else f"   -   {text}"
        self.set_font('Times', '', 10.5)
        self.set_text_color(20, 20, 20)
        self.multi_cell(w_avail, 5.2, full, align='J', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1.5)

    def code_box(self, code_text):
        self.set_font('Courier', '', 8)
        self.set_text_color(25, 25, 25)
        self.set_fill_color(248, 249, 250)
        self.set_draw_color(210, 215, 220)
        w_avail = self.w - self.l_margin - self.r_margin
        self.multi_cell(w_avail, 4.2, code_text, border=1, fill=True, align='L', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2.5)

print("Report generator utilities loaded successfully.")
