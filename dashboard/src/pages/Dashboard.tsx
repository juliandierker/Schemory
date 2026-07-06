import { useAuth } from '../context/AuthContext';
import CodeEditor from '../components/CodeEditor';

export default function Dashboard() {
  const { logout, sessionToken } = useAuth();

  return (
    <div className="p-8">
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
            Schema and type content is displayed using the signature "type plate" styling with syntax highlighting:
          </p>
          <div className="type-plate min-h-[200px]">
            <CodeEditor 
              content={`interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}`}
              language="typescript"
              readOnly={true}
            />
          </div>
        </section>

        <section className="mt-8 p-6 bg-surface border border-border rounded-lg">
          <h2 className="text-lg font-display font-semibold text-text mb-4">
            Available Commands
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 py-3 border-b border-border last:border-0">
              <code className="font-mono text-primary whitespace-nowrap">npx schemory signup &lt;email&gt;</code>
              <span className="text-text text-opacity-70 flex-1">Register a new account and receive an activation email</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 py-3 border-b border-border last:border-0">
              <code className="font-mono text-primary whitespace-nowrap">npx schemory activate &lt;token&gt;</code>
              <span className="text-text text-opacity-70 flex-1">Activate your account with the token from the email</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 py-3 border-b border-border last:border-0">
              <code className="font-mono text-primary whitespace-nowrap">npx schemory login &lt;token&gt;</code>
              <span className="text-text text-opacity-70 flex-1">Authenticate the CLI with your access token</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 py-3 border-b border-border last:border-0">
              <code className="font-mono text-primary whitespace-nowrap">npx schemory join &lt;team&gt;</code>
              <span className="text-text text-opacity-70 flex-1">Join or create a team</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 py-3 border-b border-border last:border-0">
              <code className="font-mono text-primary whitespace-nowrap">npx schemory push &lt;name&gt;</code>
              <span className="text-text text-opacity-70 flex-1">Push a TypeScript type or JSON schema to your team</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 py-3 border-b border-border last:border-0">
              <code className="font-mono text-primary whitespace-nowrap">npx schemory pull &lt;name&gt;</code>
              <span className="text-text text-opacity-70 flex-1">Pull a specific type or schema from your team</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 py-3 border-b border-border last:border-0">
              <code className="font-mono text-primary whitespace-nowrap">npx schemory pullAll</code>
              <span className="text-text text-opacity-70 flex-1">Pull all types and schemas from your team</span>
            </div>
          </div>
          <p className="text-text text-opacity-60 text-sm mt-4">
            Set API URL for local dev: <code className="font-mono bg-border px-1 rounded">SCHEMORY_API_URL=http://localhost:3000</code>
          </p>
        </section>
      </main>
    </div>
  );
}
