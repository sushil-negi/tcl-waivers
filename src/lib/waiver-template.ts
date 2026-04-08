/**
 * Waiver text template for Tennis Cricket League.
 * Use {PARTICIPANT_NAME} as a placeholder.
 * When isMinor is true, guardian language is inserted.
 */
export function getWaiverText(
  participantName: string,
  options?: { isMinor?: boolean; guardianName?: string }
): string {
  const isMinor = options?.isMinor || false;
  const guardianName = options?.guardianName || "Parent/Guardian";

  const minorPreamble = isMinor
    ? `\nNOTE: This waiver is signed by ${guardianName} as parent/legal guardian on behalf of the minor participant ${participantName}.\n`
    : "";

  const signerRef = isMinor
    ? `I, ${guardianName}, as parent/legal guardian of ${participantName},`
    : "I";

  const template = `
SPORTS LEAGUE PARTICIPATION AGREEMENT LIABILITY WAIVER AND RELEASE
${minorPreamble}
In consideration for being allowed to participate in any activities, games, practices, tournaments, or events organized by TCL ("League"), the undersigned participant agrees to the following:

## 1. Assumption of Risk

${signerRef} understand that participation in sports activities, including but not limited to training sessions, Practice, tournaments and related events, involves inherent risks. These risks include, but are not limited to:
- Serious bodily injury
- Permanent disability or paralysis
- Property damage
- Illness or death

${signerRef} voluntarily and knowingly assume all risks, both known and unknown, associated with participation in these activities.

## 2. Release of Liability

To the fullest extent permitted by law, ${signerRef} hereby release, waive, discharge, and hold harmless TCL, its organizers, officers, directors, volunteers, officials, sponsors, participants, property owners, and agents (collectively "Released Parties") from any and all claims, liabilities, damages, losses, or expenses arising from or related to ${isMinor ? participantName + "'s" : "my"} participation in any League activity, including claims resulting from negligence of the Released Parties.

## 3. Indemnification

${signerRef} agree to defend, indemnify, and hold harmless the Released Parties from any claims, demands, damages, costs, attorney's fees arising out of or related to ${isMinor ? participantName + "'s" : "my"} participation in League activities.

## 4. Health and Fitness Certification

${signerRef} certify that ${isMinor ? participantName + " is" : "I am"} physically fit and able to participate in athletic activities. ${signerRef} understand that it is ${isMinor ? "the participant's" : "my"} responsibility to consult a physician before participating if ${isMinor ? "they have" : "I have"} any medical concerns.

## 5. Compliance with Rules

${signerRef} agree to follow all rules, safety guidelines, and instructions provided by League officials. ${signerRef} understand that failure to comply may result in removal from participation without refund any further liability to league.

## 6. Medical Treatment Authorization

In the event of injury or medical emergency, ${signerRef} authorize League officials to obtain necessary medical treatment on ${isMinor ? participantName + "'s" : "my"} behalf. ${signerRef} accept responsibility for any related medical costs.

## 7. No Reliance on Representations

${signerRef} acknowledge that ${signerRef === "I" ? "I am" : "we are"} not relying on any oral statements or representations other than those contained in this written agreement.

## 8. Governing Law

This agreement shall be governed by and interpreted in accordance with the laws of the State of Pennsylvania.

## 9. Acknowledgment

${signerRef} have read this agreement carefully, fully understand its contents, and understand that by signing it ${signerRef === "I" ? "I am" : "we are"} giving up certain legal rights, including the right to bring legal claims against the Released Parties.${isMinor ? ` ${signerRef} confirm that ${signerRef === "I" ? "I have" : "we have"} the legal authority to sign this waiver on behalf of the minor participant ${participantName}.` : ""}

## Electronic Signature Acknowledgment

${signerRef} acknowledge that by signing this document electronically, ${signerRef === "I" ? "I am" : "we are"} providing ${isMinor ? "our" : "my"} legal consent and agree that ${isMinor ? "our" : "my"} electronic signature carries the same legal force and effect as a handwritten signature. ${signerRef} consent to conducting this transaction electronically pursuant to the U.S. Electronic Signatures in Global and National Commerce (ESIGN) Act and applicable state Uniform Electronic Transactions Act (UETA).
`.trim();

  return template.replace(/\{PARTICIPANT_NAME\}/g, participantName);
}
