export type SharedContractInstallment = {
  label: string
  dueScope: string
  amount: number
  percent: number
}

const WORD_JOINER = '\u2060'

function makeNonBreakingText(value: string) {
  return Array.from(value).join(WORD_JOINER)
}

type BuildContractDocumentViewModelInput = {
  contractType: string
  referenceDocumentLabel: string
  referenceCode: string
  projectLocation: string
  grandTotal: number
  grandTotalText: string
  bankText: string
  workStartDateDisplay: string
  workEndDateDisplay: string
  scopePreviewItemCount: number
  scopeExtraCount: number
  scopeCategoryCount: number
  scopeZoneCount: number
  selectedConditions: string[]
  notes: string
  installments: SharedContractInstallment[]
  customerNameDisplay: string
  employerSignerDisplay: string
  companyName: string
  contractorSignerName: string
  employerWitnessName: string
  contractorWitnessName: string
}

export function buildContractDocumentViewModel(input: BuildContractDocumentViewModelInput) {
  const isAnnualContract = input.contractType === 'annual_maintenance'
  const previewTitle = isAnnualContract ? 'สัญญาดูแลรักษาภูมิทัศน์' : 'สัญญารับจ้างเหมาจัดสวน'
  const previewSubtitle = isAnnualContract ? 'LANDSCAPE MAINTENANCE AGREEMENT' : 'LANDSCAPE CONSTRUCTION CONTRACT'
  const totalScopeItemCount = input.scopePreviewItemCount + input.scopeExtraCount
  const hasScopeItems = totalScopeItemCount > 0
  const scopeSummaryText = hasScopeItems
    ? `${isAnnualContract ? 'บัญชีรายการงาน' : 'รายละเอียดงานทั้งหมด'}จำนวน ${totalScopeItemCount.toLocaleString('th-TH')} รายการ ครอบคลุม ${input.scopeCategoryCount > 0 ? input.scopeCategoryCount.toLocaleString('th-TH') : '-'} หมวดงาน ใน ${input.scopeZoneCount > 0 ? input.scopeZoneCount.toLocaleString('th-TH') : '-'} โซน ให้ยึดตาม${input.referenceDocumentLabel}${input.referenceCode} และเอกสารแนบท้ายที่อ้างอิงในสัญญาฉบับนี้ โดยให้ถือเป็นส่วนหนึ่งของสัญญาโดยสมบูรณ์`
    : 'ไม่มีรายการอ้างอิงแนบท้ายสัญญา'

  const previewConditions = (input.selectedConditions.length > 0
    ? input.selectedConditions
    : isAnnualContract
      ? [
          'ผู้รับจ้างเข้าดูแลตามรอบบริการที่ตกลงและจัดทำรายงานสรุปผลหลังเข้าพื้นที่',
          'งานดูแลครอบคลุมการตัดแต่ง ใส่ปุ๋ย กำจัดวัชพืช และตรวจสอบระบบน้ำตามความเหมาะสม',
          'งานนอกขอบเขตหรือวัสดุทดแทนเพิ่มเติมให้เสนอราคาและอนุมัติเป็นลายลักษณ์อักษรก่อนดำเนินการ',
          'ผู้ว่าจ้างจัดเตรียมการเข้าพื้นที่ น้ำ และไฟฟ้าที่จำเป็นต่อการปฏิบัติงาน',
        ]
      : [
          'การเปลี่ยนแปลงแบบ วัสดุ หรือปริมาณงานต้องได้รับความเห็นชอบจากทั้งสองฝ่ายก่อนดำเนินการ',
          'ผู้รับจ้างจัดส่งมอบงานตามงวดและแจ้งผู้ว่าจ้างเพื่อตรวจรับงานทุกครั้ง',
          'งานแก้ไขที่เกิดจากความชำรุดบกพร่องในระยะรับประกันให้ดำเนินการภายในเวลาที่เหมาะสม',
          'ผู้ว่าจ้างจัดเตรียมพื้นที่ น้ำ และไฟฟ้าที่จำเป็นต่อการปฏิบัติงานหน้างาน',
        ])
    .slice(0, 5)

  const notesText = input.notes.trim()
  const clauseOneTitle = isAnnualContract ? 'ข้อ 1 วัตถุประสงค์และขอบเขตการดูแล' : 'ข้อ 1 วัตถุประสงค์และขอบเขตงาน'
  const clauseOneBody = isAnnualContract
    ? `ผู้ว่าจ้างตกลงว่าจ้างและผู้รับจ้างตกลงรับจ้างดูแลสวนและภูมิทัศน์ ณ ${input.projectLocation} ตามรายการบริการและรอบงานที่อ้างอิงจาก${input.referenceDocumentLabel}${input.referenceCode} โดยให้ถือเอกสารอ้างอิงและตารางงานแนบท้ายเป็นส่วนหนึ่งของสัญญาฉบับนี้`
    : `ผู้ว่าจ้างตกลงว่าจ้างและผู้รับจ้างตกลงรับจ้างจัดสวนพร้อมจัดหาแรงงาน วัสดุ และงานระบบที่เกี่ยวข้อง ณ ${input.projectLocation} ตามรายละเอียดใน${input.referenceDocumentLabel}${input.referenceCode} และเอกสารแนบท้ายซึ่งให้ถือเป็นส่วนหนึ่งของสัญญาฉบับนี้`
  const clauseTwoTitle = isAnnualContract ? 'ข้อ 2 มูลค่าสัญญาและรอบการชำระ' : 'ข้อ 2 มูลค่างานและเงื่อนไขการชำระ'
  const clauseTwoBody = isAnnualContract
    ? `มูลค่าสัญญาดูแลสวนรายปีรวมทั้งสิ้น ${input.grandTotal.toLocaleString('th-TH')} บาท (${input.grandTotalText}) โดยผู้ว่าจ้างตกลงชำระตามงวดค่าบริการหรือรอบบิลที่ระบุไว้ด้านล่าง ผ่านบัญชี ${input.bankText}`
    : `มูลค่างานรับจ้างรวมทั้งสิ้น ${input.grandTotal.toLocaleString('th-TH')} บาท (${input.grandTotalText}) โดยผู้ว่าจ้างตกลงชำระตามงวดความคืบหน้าหรือเงื่อนไขใน${input.referenceDocumentLabel} ผ่านบัญชี ${input.bankText}`
  const clauseThreeTitle = isAnnualContract ? 'ข้อ 3 รอบงาน การตรวจรับ และการต่ออายุ' : 'ข้อ 3 ระยะเวลาดำเนินงานและการส่งมอบ'
  const clauseThreeBody = isAnnualContract
    ? `ผู้รับจ้างเริ่มปฏิบัติงานตั้งแต่วันที่ ${input.workStartDateDisplay} และสิ้นสุดสัญญาในวันที่ ${input.workEndDateDisplay} โดยแต่ละรอบงานให้ผู้รับจ้างบันทึกผลการเข้าดูแลและผู้ว่าจ้างมีสิทธิตรวจสอบคุณภาพงานก่อนยืนยันรับงานในรอบนั้น ทั้งสองฝ่ายอาจตกลงต่ออายุสัญญาเพิ่มเติมเป็นลายลักษณ์อักษร`
    : `ผู้รับจ้างเริ่มงานตั้งแต่วันที่ ${input.workStartDateDisplay} และส่งมอบงานให้แล้วเสร็จภายในวันที่ ${input.workEndDateDisplay} ผู้ว่าจ้างมีสิทธิตรวจรับงานตามงวดที่ส่งมอบ และงานเพิ่มเติมหรือเปลี่ยนแปลงให้ถือราคาตามข้อตกลงเพิ่มเติมเป็นลายลักษณ์อักษร`
  const clauseFourTitle = isAnnualContract ? 'ข้อ 4 เงื่อนไขการให้บริการ' : 'ข้อ 4 เงื่อนไขทั่วไปและการรับประกัน'
  const clauseFourBody = isAnnualContract
    ? 'ผู้ว่าจ้างยินยอมให้ผู้รับจ้างเข้าพื้นที่ตามวันและเวลาที่ตกลง หากไม่สามารถเข้าปฏิบัติงานได้ตามกำหนดเพราะเหตุจากผู้ว่าจ้าง ให้เลื่อนรอบงานตามความเหมาะสมโดยไม่ถือเป็นการผิดสัญญา ส่วนวัสดุสิ้นเปลืองหรือการทดแทนต้นไม้ที่อยู่นอกแผนบริการ ให้เสนอราคาและอนุมัติก่อนดำเนินการ'
    : 'ผู้รับจ้างรับประกันความเรียบร้อยของงานตามขอบเขตที่ส่งมอบ และจะเข้าดำเนินการแก้ไขข้อบกพร่องที่เกิดจากการติดตั้งหรือการดำเนินงานของผู้รับจ้างภายในระยะเวลาที่เหมาะสม ทั้งนี้ ความเสียหายจากการใช้งานผิดวิธี เหตุสุดวิสัย หรือการแก้ไขโดยบุคคลภายนอกไม่อยู่ในเงื่อนไขรับประกัน'

  return {
    isAnnualContract,
    previewTitle,
    nonBreakingPreviewTitle: makeNonBreakingText(previewTitle),
    previewSubtitle,
    hasScopeItems,
    totalScopeItemCount,
    scopeSummaryText,
    previewConditions,
    notesText,
    clauseOneTitle,
    clauseOneBody,
    clauseTwoTitle,
    clauseTwoBody,
    clauseThreeTitle,
    clauseThreeBody,
    clauseFourTitle,
    clauseFourBody,
    showAttachmentRegistry: false,
    signature: {
      employerTitle: isAnnualContract ? 'ลงนามฝ่ายผู้ว่าจ้าง' : 'ลงชื่อ ผู้ว่าจ้าง',
      employerName: isAnnualContract ? input.customerNameDisplay : input.employerSignerDisplay,
      contractorTitle: isAnnualContract ? 'ลงนามฝ่ายผู้รับจ้าง' : 'ลงชื่อ ผู้รับจ้าง',
      contractorName: isAnnualContract ? input.companyName : input.contractorSignerName,
      employerWitnessTitle: isAnnualContract ? 'พยานฝ่ายผู้ว่าจ้าง' : 'ลงชื่อ พยาน',
      employerWitnessName: isAnnualContract ? '………………………………………………………………………………………………………………' : input.employerWitnessName,
      contractorWitnessTitle: isAnnualContract ? 'พยานฝ่ายผู้รับจ้าง' : 'ลงชื่อ พยาน',
      contractorWitnessName: isAnnualContract ? '………………………………………………………………………………………………………………' : input.contractorWitnessName,
    },
    installments: input.installments,
  }
}