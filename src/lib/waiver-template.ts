/**
 * Waiver text template for Tennis Cricket League.
 * Use {PARTICIPANT_NAME} as a placeholder — it will be replaced with the signer's name.
 */
export function getWaiverText(participantName: string): string {
  const template = `
SPORTS LEAGUE PARTICIPATION AGREEMENT LIABILITY WAIVER AND RELEASE

In consideration for being allowed to participate in any activities, games, practices, tournaments, or events organized by TCL ("League"), the undersigned participant agrees to the following:

## 1. Assumption of Risk

I understand that participation in sports activities, including but not limited to training sessions, Practice, tournaments and related events, involves inherent risks. These risks include, but are not limited to:
- Serious bodily injury
- Permanent disability or paralysis
- Property damage
- Illness or death

I voluntarily and knowingly assume all risks, both known and unknown, associated with participation in these activities.

## 2. Release of Liability

To the fullest extent permitted by law, I hereby release, waive, discharge, and hold harmless TCL, its organizers, officers, directors, volunteers, officials, sponsors, participants, property owners, and agents (collectively "Released Parties") from any and all claims, liabilities, damages, losses, or expenses arising from or related to my participation in any League activity, including claims resulting from negligence of the Released Parties.

## 3. Indemnification

I agree to defend, indemnify, and hold harmless the Released Parties from any claims, demands, damages, costs, attorney's fees arising out of or related to my participation in League activities.

## 4. Health and Fitness Certification

I certify that I am physically fit and able to participate in athletic activities. I understand that it is my responsibility to consult a physician before participating if I have any medical concerns.

## 5. Compliance with Rules

I agree to follow all rules, safety guidelines, and instructions provided by League officials. I understand that failure to comply may result in removal from participation without refund any further liability to league.

## 6. Medical Treatment Authorization

In the event of injury or medical emergency, I authorize League officials to obtain necessary medical treatment on my behalf. I accept responsibility for any related medical costs.

## 7. No Reliance on Representations

I acknowledge that I am not relying on any oral statements or representations other than those contained in this written agreement.

## 8. Governing Law

This agreement shall be governed by and interpreted in accordance with the laws of the State of Pennsylvania.

## 9. Acknowledgment

I have read this agreement carefully, fully understand its contents, and understand that by signing it I am giving up certain legal rights, including the right to bring legal claims against the Released Parties.

## Electronic Signature Acknowledgment

I acknowledge that by signing this document electronically, I am providing my legal consent and agree that my electronic signature carries the same legal force and effect as a handwritten signature. I consent to conducting this transaction electronically pursuant to the U.S. Electronic Signatures in Global and National Commerce (ESIGN) Act and applicable state Uniform Electronic Transactions Act (UETA).
`.trim();

  return template.replace(/\{PARTICIPANT_NAME\}/g, participantName);
}
