export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = { status: "idle" };

export function mutationError(
  code?: string,
  entity: "project" | "endpoint" = "project",
): ActionState {
  if (code === "23505") {
    const field = entity === "project" ? "slug" : "path";
    const message =
      entity === "project"
        ? "That slug is unavailable. Choose another one."
        : "This project already has an endpoint with that method and path.";
    return { status: "error", message, fieldErrors: { [field]: [message] } };
  }
  if (code === "23514" || code === "22P02" || code === "22021") {
    return {
      status: "error",
      message:
        "The configuration could not be saved. Check the field limits and JSON response.",
    };
  }
  return {
    status: "error",
    message: "We could not save your changes. Please try again.",
  };
}
