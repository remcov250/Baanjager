"use client";

// A submit button that asks first. For the few things that can't be undone
// (deleting a source); vacancies have no delete at all.
export function ConfirmButton({
  message,
  children,
  ...props
}: { message: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
