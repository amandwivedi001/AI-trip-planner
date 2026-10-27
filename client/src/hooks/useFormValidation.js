import { useState, useMemo, useCallback } from "react";

// Form validation hook with simple rule objects
export const useFormValidation = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback(
    (fieldName, value, currentValues = values) => {
      const rules = validationRules[fieldName];
      if (!rules) return null;

      // Safety check for currentValues
      if (!currentValues || typeof currentValues !== "object") {
        currentValues = {};
      }

      // Required validation
      if (rules.required) {
        // Handle boolean fields (like checkboxes)
        if (typeof value === "boolean") {
          if (!value) {
            return `${
              fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
            } is required`;
          }
        } else {
          // Handle string/text fields
          if (!value || value.toString().trim() === "") {
            return `${
              fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
            } is required`;
          }
        }
      }

      // Email validation
      if (rules.email && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return "Please enter a valid email address";
        }
      }

      // Min length validation
      if (rules.minLength && value && value.length < rules.minLength) {
        return `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } must be at least ${rules.minLength} characters`;
      }

      // Max length validation
      if (rules.maxLength && value && value.length > rules.maxLength) {
        return `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } must be no more than ${rules.maxLength} characters`;
      }

      // Pattern validation
      if (rules.pattern && value && !rules.pattern.test(value)) {
        return (
          rules.message ||
          `${
            fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
          } format is invalid`
        );
      }

      // Custom validation function
      if (rules.validate && typeof rules.validate === "function") {
        try {
          return rules.validate(value, currentValues);
        } catch (e) {
          // Return null if validation fails due to initialization issues
          return null;
        }
      }

      return null;
    },
    [validationRules, values]
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;

    setValues((prev) => ({ ...prev, [name]: fieldValue }));

    // Clear error if field is being modified
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateAll = () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(validationRules).reduce(
        (acc, key) => ({
          ...acc,
          [key]: true,
        }),
        {}
      )
    );

    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  // Calculate isValid using useMemo to avoid initialization issues
  const isValid = useMemo(() => {
    // Only validate if values object has been properly initialized
    if (!values || typeof values !== "object") {
      return false;
    }

    return Object.keys(validationRules).every((fieldName) => {
      try {
        const error = validateField(fieldName, values[fieldName], values);
        return !error;
      } catch (e) {
        // If validation fails due to initialization issues, return false
        return false;
      }
    });
  }, [values, validationRules, validateField]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid,
    setValues,
    setErrors,
  };
};
