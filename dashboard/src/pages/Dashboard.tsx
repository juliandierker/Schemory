import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { logout, sessionToken } = useAuth();

  return (
    <div className="min-h-screen bg-surface p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-display font-bold text-text">
          Schemory Dashboard
        </h1>
        <button
          onClick={logout}
          className="px-4 py-2 border border-border rounded-md font-body text-text hover:bg-border transition-colors"
        >
          Log Out
        </button>
      </header>

      <main className="max-w-4xl mx-auto">
        <section className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-display font-semibold text-text mb-4">
            Welcome to Schemory
          </h2>
          <p className="text-text mb-4">
            This is your team's centralized space for managing TypeScript types 
            and JSON schemas.
          </p>
        </section>

        <section className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-lg font-display font-semibold text-text mb-4">
            Session Info
          </h2>
          <div className="type-plate text-sm">
            <div className="mb-2">
              <span className="text-text text-opacity-70">Session Token:</span>{' '}
              <span className="break-all">{sessionToken?.slice(0, 20)}...</span>
            </div>
            <div>
              <span className="text-text text-opacity-70">Status:</span>{' '}
              <span className="text-valid">Authenticated</span>
            </div>
          </div>
        </section>

        <section className="mt-8 p-6 bg-surface border border-border rounded-lg">
          <h2 className="text-lg font-display font-semibold text-text mb-4">
            Type Plate Example
          </h2>
          <p className="text-text text-opacity-70 mb-2">
            Schema and type content is displayed using the signature "type plate" styling:
          </p>
          <div className="type-plate">
            {`{
  "kind": "type",
  "name": "User",
  "content": "interface User { id: string; email: string; name?: string; }"
}`}
          </div>
        </section>
      </main>
    </div>
  );
}
