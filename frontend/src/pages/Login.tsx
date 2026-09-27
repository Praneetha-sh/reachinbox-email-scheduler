import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleEmailLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // The assignment requires Google OAuth authentication.
    // Email/password authentication is not implemented.
    alert("Please use Login with Google.");
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <section className="w-full max-w-[346px] rounded-lg border border-gray-200 bg-white px-10 py-9">
        <h1 className="text-center text-[28px] font-semibold text-gray-900">
          Login
        </h1>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mt-6 flex h-[34px] w-full items-center justify-center gap-2 rounded-lg bg-[#e3f5ec] text-[12px] font-normal text-gray-700 transition hover:bg-[#d8f0e4]"
        >
          <span className="font-semibold text-[#4285F4]">G</span>
          <span>Login with Google</span>
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />

          <span className="whitespace-nowrap text-[10px] text-gray-400">
            or sign up through email
          </span>

          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-2">
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-[39px] w-full rounded-lg border-0 bg-[#f3f6f4] px-3 text-[11px] text-gray-700 outline-none placeholder:text-gray-500 focus:ring-1 focus:ring-gray-300"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-[39px] w-full rounded-lg border-0 bg-[#f3f6f4] px-3 text-[11px] text-gray-700 outline-none placeholder:text-gray-500 focus:ring-1 focus:ring-gray-300"
          />

          <button
            type="submit"
            className="mt-3 h-[34px] w-full rounded-lg bg-[#00a63c] text-[12px] font-medium text-white transition hover:bg-[#009437]"
          >
            Login
          </button>
        </form>
      </section>
    </main>
  );
}