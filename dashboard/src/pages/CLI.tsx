import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CopyIcon, CheckIcon } from '../components/icons';

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language = 'bash' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-code-bg border border-border rounded-lg p-4 mb-4">
      <pre className="text-sm font-mono text-code-text overflow-x-auto whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1 rounded text-text-secondary hover:text-text hover:bg-hover transition-colors"
        aria-label="Copy code"
      >
        {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
      </button>
      <div className="absolute bottom-2 right-2 text-xs text-text-secondary font-mono">
        {language}
      </div>
    </div>
  );
}

function CLICommand({ command, description }: { command: string; description: string }) {
  return (
    <div className="mb-6">
      <CodeBlock code={command} />
      <p className="text-text-secondary text-sm mb-4">{description}</p>
    </div>
  );
}

export default function CLI() {
  const { user, sessionToken } = useAuth();

  // Get the token for CLI commands
  const token = sessionToken || 'YOUR_TOKEN_HERE';

  // Get user's first name from email for personalization
  const emailDisplay = user?.email ? (
    <span className="font-mono text-primary">{user.email}</span>
  ) : (
    <span className="font-mono text-text-secondary">your@email.com</span>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-text mb-2">CLI Setup</h1>
        <p className="text-text text-opacity-70 font-body">
          Connect to Schemory from your terminal. Logged in as: {emailDisplay}
        </p>
      </header>

      {/* Connection Section */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-semibold text-text mb-4 border-b border-border pb-2">
          Connect to CLI
        </h2>
        
        <div className="bg-surface-elevated rounded-lg p-6 mb-6">
          <p className="text-text mb-4">
            Authenticate your CLI with your personal access token. This token is unique to your account and should be kept secret.
          </p>
          
          <CLICommand
            command={`npx schemory login ${token}`}
            description="Authenticate with your Schemory account using your personal access token."
          />
          
          <p className="text-text-secondary text-sm">
            <strong className="text-text">Note:</strong> Replace the token above with your actual access token if not auto-filled.
            Your token is stored securely and is only visible to you.
          </p>
        </div>
      </section>

      {/* Available Commands Section */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-semibold text-text mb-4 border-b border-border pb-2">
          Available Commands
        </h2>
        
        <div className="bg-surface-elevated rounded-lg p-6">
          <p className="text-text mb-6">
            Once authenticated, you can use the following commands with your token:
          </p>

          {/* Signup Command */}
          <CLICommand
            command={`npx schemory signup newuser@example.com`}
            description="Register a new account. An activation email will be sent to the provided email address."
          />

          {/* Activate Command */}
          <CLICommand
            command={`npx schemory activate act_your_activation_token_here`}
            description="Activate your account using the activation token from your email. You'll be prompted to set a password."
          />

          {/* Login Command */}
          <CLICommand
            command={`npx schemory login ${token}`}
            description="Authenticate with your access token. Once logged in, you can use file operations."
          />

          {/* Logout Command */}
          <CLICommand
            command={`npx schemory logout`}
            description="Log out of the current session and clear your authentication token."
          />

          {/* Team Management */}
          <CLICommand
            command={`npx schemory create MyTeam`}
            description="Create a new team. Returns a join code that others can use to join your team."
          />

          <CLICommand
            command={`npx schemory invite TeamId`}
            description="Get the join code for a specific team to share with others."
          />

          <CLICommand
            command={`npx schemory join JOIN_CODE_HERE`}
            description="Join an existing team using their join code."
          />

          <CLICommand
            command={`npx schemory use TeamName`}
            description="Switch to a different team as your active team for push/pull operations."
          />

          <CLICommand
            command={`npx schemory status`}
            description="Show your current login status, active team, and file count."
          />

          <CLICommand
            command={`npx schemory sync`}
            description="Sync your local CLI configuration with server data to fix any mismatches."
          />

          {/* File Operations */}
          <CLICommand
            command={`npx schemory push ./my-types.ts`}
            description="Push a TypeScript type or JSON schema file to your team's collection."
          />

          <CLICommand
            command={`npx schemory pull`}
            description="Pull all items from your team. Files are saved to your current directory."
          />

          <CLICommand
            command={`npx schemory pull UserSchema`}
            description="Pull a specific item by name from your team."
          />

          <CLICommand
            command={`npx schemory pullAll`}
            description="Legacy command: Pulls all team items (same as pull without arguments)."
          />
        </div>
      </section>

      {/* Working Examples Section */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-semibold text-text mb-4 border-b border-border pb-2">
          Working Examples with Your Credentials
        </h2>
        
        <div className="bg-surface-elevated rounded-lg p-6">
          <p className="text-text mb-6">
            Here are complete, working examples using your actual credentials:
          </p>

          <div className="space-y-4">
            <CodeBlock
              code={`# Set up a new TypeScript project with Schemory types
mkdir my-schemory-project
cd my-schemory-project
npm init -y

# Authenticate with your token
npx schemory login ${token}

# Check if authentication worked
npx schemory pull

# Push your types
echo 'export interface User { id: number; name: string; }' > User.ts
npx schemory push ./User.ts`}
              language="bash"
            />

            <CodeBlock
              code={`# Example: Working with a team
# Create a team
npx schemory create MyDevTeam

# Get the join code for your teammate
npx schemory invite

# Your teammate runs this with the join code you provided:
npx schemory join JOIN_CODE_FROM_ABOVE

# Now you can share types
npx schemory push ./shared-types.ts
npx schemory pull`}
              language="bash"
            />

            <CodeBlock
              code={`# Example: Full workflow
# 1. Sign up (only needed once)
npx schemory signup developer@example.com

# 2. Activate (check your email for the activation token)
npx schemory activate act_token_from_email

# 3. Login with your new token
npx schemory login ${token}

# 4. Create a team
npx schemory create AcmeTeam

# 5. Push your schemas
echo '{"type": "object", "properties": {"name": {"type": "string"}}}' > UserSchema.json
npx schemory push ./UserSchema.json

# 6. Switch teams if needed
npx schemory use AcmeTeam

# 7. Check your status
npx schemory status

# 8. Sync with server if needed
npx schemory sync

# 9. Your teammate pulls it
npx schemory pull UserSchema

# 10. Logout when done
npx schemory logout`}
              language="bash"
            />
          </div>

          <p className="text-text-secondary text-sm mt-6">
            <strong className="text-primary">Important:</strong> Your access token ({token.slice(0, 8)}...) 
            is your password to the Schemory CLI. Never share it or commit it to version control.
          </p>
        </div>
      </section>

      {/* Tips Section */}
      <section>
        <h2 className="text-xl font-display font-semibold text-text mb-4 border-b border-border pb-2">
          Tips & Best Practices
        </h2>
        
        <div className="bg-surface-elevated rounded-lg p-6">
          <ul className="space-y-4 text-text-secondary text-sm">
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>Store your token in a secure place. You'll need it for every CLI session.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>Team membership is required for push/pull operations.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>All type/schema files are shared within your team automatically.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>Use <code className="bg-code-bg px-1 rounded font-mono">npx schemory pull</code> to sync with your team's latest items.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>Use <code className="bg-code-bg px-1 rounded font-mono">npx schemory status</code> to check your current login status and active team.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>Use <code className="bg-code-bg px-1 rounded font-mono">npx schemory use TeamName</code> to switch between teams.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>If teams appear mismatched between CLI and dashboard, run <code className="bg-code-bg px-1 rounded font-mono">npx schemory sync</code> to update local data.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>Use <code className="bg-code-bg px-1 rounded font-mono">npx schemory logout</code> to end your CLI session and clear your authentication token.</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
