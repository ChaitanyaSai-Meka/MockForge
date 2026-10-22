export function AuthSetupNotice() {
  return (
    <div role="status" className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
      Authentication is not configured yet. Add the Supabase project settings
      from the README to enable sign-up and login.
    </div>
  );
}
