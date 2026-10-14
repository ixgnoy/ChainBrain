export type Role = "owner" | "bank" | "regulator";
export type View = "operate" | "bank";

/** Operate shows owner chat, approvals and edit controls, so the read-only Regulator role only gets Bank / Compliance. */
export const viewsFor = (role: Role): View[] => (role === "regulator" ? ["bank"] : ["operate", "bank"]);
export const effectiveView = (role: Role, view: View): View => (viewsFor(role).includes(view) ? view : "bank");
