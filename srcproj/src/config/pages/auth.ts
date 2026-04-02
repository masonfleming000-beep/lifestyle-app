export interface AuthFieldConfig {
  id: string;
  name: string;
  label: string;
  type: "email" | "password" | "text";
  required?: boolean;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
  autocomplete?: string;
  inputmode?: string;
  spellcheck?: boolean;
}

export interface AuthHiddenFieldConfig {
  name: string;
  value: string;
}

export interface AuthFooterLinkConfig {
  prefix?: string;
  label: string;
  href: string;
}

export interface AuthMessageConfig {
  id: string;
  text?: string;
  isError?: boolean;
}

export interface AuthPageRenderConfig {
  title: string;
  description: string;
  hero: {
    kicker: string;
    title: string;
    description: string;
  };
  card: {
    title: string;
    subtitle: string;
  };
  message: AuthMessageConfig;
  form: {
    id: string;
    submitLabel: string;
    fields: AuthFieldConfig[];
    hiddenFields?: AuthHiddenFieldConfig[];
  };
  oauthAction?: {
    label: string;
    href: string;
    variant?: "primary" | "secondary" | "danger";
  };
  footerLinks?: AuthFooterLinkConfig[];
}

export interface AuthClientConfig {
  formId: string;
  messageId: string;
  endpoint: string;
  requiredFields: string[];
  successMessage: string;
  genericErrorMessage: string;
  successRedirectTo?: string;
  requestBodyFields?: string[];
  initialMessage?: string;
  initialError?: boolean;
}

export const loginPageConfig = (message = ""): AuthPageRenderConfig => ({
  title: "Login | Lifestyle App",
  description: "Sign in to Lifestyle App",
  hero: {
    kicker: "Lifestyle App",
    title: "Build structure. Track progress.",
    description: "Sign in to access your personal dashboard for habits, fitness, nutrition, goals, education, career, and hobbies.",
  },
  card: {
    title: "Welcome back",
    subtitle: "Sign in with email and password or continue with Google.",
  },
  message: {
    id: "login-message",
    text: message,
    isError: false,
  },
  form: {
    id: "login-form",
    submitLabel: "Sign in",
    fields: [
      {
        id: "email",
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        autocomplete: "email",
        inputmode: "email",
        spellcheck: false,
      },
      {
        id: "password",
        name: "password",
        label: "Password",
        type: "password",
        required: true,
        autocomplete: "current-password",
        spellcheck: false,
      },
    ],
  },
  oauthAction: {
    label: "Continue with Google",
    href: "/api/auth/google/start",
    variant: "secondary",
  },
  footerLinks: [
    {
      prefix: "Don’t have an account?",
      label: "Create one",
      href: "/signup",
    },
    {
      label: "Forgot password?",
      href: "/forgot-password",
    },
  ],
});

export const loginClientConfig = (message = ""): AuthClientConfig => ({
  formId: "login-form",
  messageId: "login-message",
  endpoint: "/api/auth/login",
  requiredFields: ["email", "password"],
  requestBodyFields: ["email", "password"],
  successMessage: "Login successful. Redirecting...",
  genericErrorMessage: "Login failed.",
  successRedirectTo: "/",
  initialMessage: message,
  initialError: false,
});

export const signupPageConfig: AuthPageRenderConfig = {
  title: "Sign Up | Lifestyle App",
  description: "Create your Lifestyle App account",
  hero: {
    kicker: "Lifestyle App",
    title: "Create your account.",
    description: "Sign up with email and password to create your account.",
  },
  card: {
    title: "Get started",
    subtitle: "Use email and password to create your account.",
  },
  message: {
    id: "signup-message",
  },
  form: {
    id: "signup-form",
    submitLabel: "Create account",
    fields: [
      {
        id: "email",
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        autocomplete: "email",
        inputmode: "email",
        spellcheck: false,
      },
      {
        id: "username",
        name: "username",
        label: "Username",
        type: "text",
        required: true,
        minlength: 3,
        maxlength: 24,
        pattern: "[a-zA-Z0-9._-]+",
        autocomplete: "username",
        spellcheck: false,
      },
      {
        id: "password",
        name: "password",
        label: "Password",
        type: "password",
        required: true,
        minlength: 12,
        autocomplete: "new-password",
        spellcheck: false,
      },
    ],
  },
  oauthAction: {
    label: "Continue with Google",
    href: "/api/auth/google/start",
    variant: "secondary",
  },
  footerLinks: [
    {
      prefix: "Already have an account?",
      label: "Sign in",
      href: "/login",
    },
  ],
};

export const signupClientConfig: AuthClientConfig = {
  formId: "signup-form",
  messageId: "signup-message",
  endpoint: "/api/auth/signup",
  requiredFields: ["email", "username", "password"],
  requestBodyFields: ["email", "username", "password"],
  successMessage: "Account created. Redirecting...",
  genericErrorMessage: "Sign up failed.",
  successRedirectTo: "/today",
};

export const forgotPasswordPageConfig: AuthPageRenderConfig = {
  title: "Forgot Password | Lifestyle App",
  description: "Reset your password",
  hero: {
    kicker: "Lifestyle App",
    title: "Reset your password.",
    description: "Enter your email and we’ll send you a reset link so you can get back into your account.",
  },
  card: {
    title: "Forgot password",
    subtitle: "Submit the email tied to your account and we’ll send a reset link if it exists.",
  },
  message: {
    id: "forgot-message",
  },
  form: {
    id: "forgot-form",
    submitLabel: "Send reset link",
    fields: [
      {
        id: "email",
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        autocomplete: "email",
        inputmode: "email",
        spellcheck: false,
      },
    ],
  },
  footerLinks: [
    {
      label: "Back to login",
      href: "/login",
    },
  ],
};

export const forgotPasswordClientConfig: AuthClientConfig = {
  formId: "forgot-form",
  messageId: "forgot-message",
  endpoint: "/api/auth/forgot-password",
  requiredFields: ["email"],
  requestBodyFields: ["email"],
  successMessage: "If that email exists, a reset link has been sent.",
  genericErrorMessage: "Request failed.",
};

export const resetPasswordPageConfig = (token = ""): AuthPageRenderConfig => ({
  title: "Reset Password | Lifestyle App",
  description: "Choose a new password",
  hero: {
    kicker: "Lifestyle App",
    title: "Choose a new password.",
    description: "Enter a strong new password for your account to finish the reset process.",
  },
  card: {
    title: "Reset password",
    subtitle: "Set a new password with at least 12 characters, then return to sign in.",
  },
  message: {
    id: "reset-message",
  },
  form: {
    id: "reset-form",
    submitLabel: "Reset password",
    hiddenFields: [
      {
        name: "token",
        value: token,
      },
    ],
    fields: [
      {
        id: "password",
        name: "password",
        label: "New password",
        type: "password",
        required: true,
        minlength: 12,
        autocomplete: "new-password",
        spellcheck: false,
      },
    ],
  },
  footerLinks: [
    {
      label: "Back to login",
      href: "/login",
    },
  ],
});

export const resetPasswordClientConfig: AuthClientConfig = {
  formId: "reset-form",
  messageId: "reset-message",
  endpoint: "/api/auth/reset-password",
  requiredFields: ["token", "password"],
  requestBodyFields: ["token", "password"],
  successMessage: "Password reset successful. You can now sign in.",
  genericErrorMessage: "Reset failed.",
};
