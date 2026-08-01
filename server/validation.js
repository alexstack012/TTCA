export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && uuidPattern.test(value);
}

export function isUniqueArray(values, maximum, key = (value) => value) {
  return (
    Array.isArray(values) &&
    values.length <= maximum &&
    new Set(values.map(key)).size === values.length
  );
}

export function isOptionalString(value, maximum) {
  return value == null || (typeof value === 'string' && value.length <= maximum);
}

export function requireUuidParameter(parameterName) {
  return (request, response, next) => {
    if (!isUuid(request.params[parameterName])) {
      return response.status(400).json({ message: 'The record identifier is invalid.' });
    }
    next();
  };
}
