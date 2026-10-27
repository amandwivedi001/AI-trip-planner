// Authentication hooks
export * from "./useAuth";

// Trip management hooks
export * from "./useTrips";

// AI-powered hooks
export * from "./useAI";

// Common form validation hook
import { useState, useCallback } from "react";

export const useFormValidation = (
  initialValues = {},
  validationSchema = {}
) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback(
    (name, value) => {
      const validator = validationSchema[name];
      if (!validator) return "";

      if (typeof validator === "function") {
        return validator(value, values) || "";
      }

      if (validator.required && (!value || value.trim() === "")) {
        return validator.message || `${name} is required`;
      }

      if (validator.minLength && value && value.length < validator.minLength) {
        return (
          validator.message ||
          `${name} must be at least ${validator.minLength} characters`
        );
      }

      if (validator.maxLength && value && value.length > validator.maxLength) {
        return (
          validator.message ||
          `${name} must not exceed ${validator.maxLength} characters`
        );
      }

      if (validator.pattern && value && !validator.pattern.test(value)) {
        return validator.message || `${name} format is invalid`;
      }

      if (validator.email && value && !/\S+@\S+\.\S+/.test(value)) {
        return validator.message || "Email format is invalid";
      }

      if (validator.custom && typeof validator.custom === "function") {
        return validator.custom(value, values) || "";
      }

      return "";
    },
    [validationSchema, values]
  );

  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationSchema).forEach((name) => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField, validationSchema]);

  const handleChange = useCallback(
    (name, value) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (name) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, values[name]);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validateField, values]
  );

  const handleSubmit = useCallback(
    (onSubmit) => {
      return async (e) => {
        if (e && e.preventDefault) {
          e.preventDefault();
        }

        setIsSubmitting(true);

        // Mark all fields as touched
        const allTouched = {};
        Object.keys(validationSchema).forEach((key) => {
          allTouched[key] = true;
        });
        setTouched(allTouched);

        if (validateAll()) {
          try {
            await onSubmit(values);
          } catch (error) {
            console.error("Form submission error:", error);
          }
        }

        setIsSubmitting(false);
      };
    },
    [values, validateAll, validationSchema]
  );

  const reset = useCallback(
    (newValues = initialValues) => {
      setValues(newValues);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    },
    [initialValues]
  );

  const setFieldValue = useCallback(
    (name, value) => {
      handleChange(name, value);
    },
    [handleChange]
  );

  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const hasErrors = Object.keys(errors).some((key) => errors[key]);
  const isValid = !hasErrors && Object.keys(touched).length > 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    hasErrors,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    validateAll,
    reset,
  };
};
