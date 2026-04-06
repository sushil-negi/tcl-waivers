/**
 * Waiver text template for Tennis Cricket League.
 * Replace this content with your own waiver text.
 * Use {PARTICIPANT_NAME} as a placeholder — it will be replaced with the signer's name.
 */
export function getWaiverText(participantName: string): string {
  const template = `
In consideration of being allowed to participate in Tennis Cricket League ("TCL") activities, events, tournaments, practices, and related programs, I, {PARTICIPANT_NAME}, hereby acknowledge, agree, and represent as follows:

## Assumption of Risk

I acknowledge that participating in cricket and tennis activities involves inherent risks of physical injury, including but not limited to: sprains, fractures, concussions, muscle injuries, ligament tears, and other bodily harm. I understand that these risks may result from my own actions, the actions of other participants, or the condition of facilities and equipment. I voluntarily assume all such risks, both known and unknown, even if arising from the negligence of TCL, its organizers, officials, volunteers, or other participants.

## Waiver and Release of Liability

I, {PARTICIPANT_NAME}, hereby release, discharge, and hold harmless Tennis Cricket League, its organizers, officers, directors, employees, agents, volunteers, sponsors, venue owners, and all other persons or entities acting on their behalf (collectively, the "Released Parties") from any and all claims, demands, causes of action, damages, losses, or liabilities of any kind, whether known or unknown, arising out of or related to my participation in TCL activities, including but not limited to personal injury, property damage, or death.

## Medical Authorization

I authorize TCL and its representatives to seek and obtain emergency medical treatment on my behalf if I am unable to do so myself during any TCL event or activity. I understand that I am solely responsible for any medical costs incurred.

## Fitness to Participate

I represent that I am physically fit and have no medical condition that would prevent my safe participation in TCL activities. I agree to notify TCL organizers of any changes to my health status that may affect my ability to participate safely.

## Code of Conduct

I agree to abide by all rules, regulations, and codes of conduct established by TCL. I understand that unsportsmanlike behavior, including but not limited to verbal abuse, physical altercation, or cheating, may result in immediate removal from the league without refund.

## Media Release

I grant TCL permission to use my name, likeness, and photographs or video recordings taken during TCL events for promotional, educational, or informational purposes without compensation.

## Indemnification

I agree to indemnify and hold harmless the Released Parties from any and all claims, actions, suits, procedures, costs, expenses, damages, and liabilities arising out of my involvement in TCL activities, including any claims brought by third parties.

## Electronic Signature Acknowledgment

I acknowledge that by signing this document electronically, I am providing my legal consent and agree that my electronic signature carries the same legal force and effect as a handwritten signature. I consent to conducting this transaction electronically pursuant to the U.S. Electronic Signatures in Global and National Commerce (ESIGN) Act and applicable state Uniform Electronic Transactions Act (UETA).

## Governing Law

This waiver shall be governed by and construed in accordance with the laws of the state in which TCL primarily operates, without regard to conflict of law principles.

## Severability

If any provision of this waiver is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

I HAVE READ THIS WAIVER AND RELEASE, FULLY UNDERSTAND ITS TERMS, AND UNDERSTAND THAT I AM GIVING UP SUBSTANTIAL RIGHTS, INCLUDING MY RIGHT TO SUE. I SIGN IT FREELY AND VOLUNTARILY WITHOUT ANY INDUCEMENT.
`.trim();

  return template.replace(/\{PARTICIPANT_NAME\}/g, participantName);
}
