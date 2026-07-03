/** @type {import("stylelint").Config} */
module.exports = {
  extends: ["stylelint-config-standard"],
  rules: {
    "alpha-value-notation": null,
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["apply", "layer", "responsive", "screen", "tailwind", "variants"],
      },
    ],
    "color-function-alias-notation": null,
    "color-function-notation": null,
    "color-hex-length": null,
    "custom-property-pattern": null,
    "declaration-empty-line-before": null,
    "length-zero-no-unit": null,
    "rule-empty-line-before": null,
    "selector-class-pattern": null,
    "value-keyword-case": [
      "lower",
      {
        ignoreProperties: ["/^--font-font-family-/"],
      },
    ],
  },
};
