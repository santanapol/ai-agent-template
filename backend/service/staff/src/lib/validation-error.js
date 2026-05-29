function mapValidationCode(keyword) {
  switch (keyword) {
    case "required":
      return "REQUIRED";
    case "type":
      return "INVALID_TYPE";
    case "minimum":
    case "maximum":
    case "minLength":
    case "maxLength":
      return "OUT_OF_RANGE";
    case "pattern":
    case "format":
      return "INVALID_FORMAT";
    case "additionalProperties":
      return "UNKNOWN_FIELD";
    default:
      return "INVALID_FORMAT";
  }
}

export function formatValidationErrors(source, validationDetails) {
  if (!validationDetails) return [];
  return validationDetails.map((detail) => {
    let pathTail = detail.instancePath
      ? detail.instancePath.replace(/^\//, "").replace(/\//g, ".")
      : "";
    if (
      detail.keyword === "required" &&
      detail.params &&
      detail.params.missingProperty
    ) {
      pathTail = pathTail
        ? `${pathTail}.${detail.params.missingProperty}`
        : detail.params.missingProperty;
    }
    const path = pathTail ? `${source}.${pathTail}` : source;

    return {
      path,
      code: mapValidationCode(detail.keyword),
      message: detail.message || "Invalid",
    };
  });
}
