import { motion } from 'framer-motion';
import {
  Card, Text, Title, Button, TextInput, Group, Stack,
  ThemeIcon, Box, Code,
} from '@mantine/core';
import { Terminal, Globe, Server, Sparkles, Zap } from 'lucide-react';

interface ConnectionViewProps {
  transport: 'stdio' | 'streamable-http';
  setTransport: (v: 'stdio' | 'streamable-http') => void;
  command: string;
  setCommand: (v: string) => void;
  args: string;
  setArgs: (v: string) => void;
  httpUrl: string;
  setHttpUrl: (v: string) => void;
  onConnect: () => void;
  loading: boolean;
  connected: boolean;
}

export default function ConnectionView({
  transport, setTransport, command, setCommand, args, setArgs,
  httpUrl, setHttpUrl, onConnect, loading, connected,
}: ConnectionViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 32 }}
    >
      <Box w="100%" maw={480}>
        {/* Hero */}
        <Stack align="center" mb={40} gap="md">
          <Box pos="relative">
            <Box pos="absolute" top={-8} left={-8} right={-8} bottom={-8}
              style={{ borderRadius: 24, background: 'var(--accent-glow)', filter: 'blur(20px)' }} />
            <ThemeIcon size={72} radius={20} variant="gradient" gradient={{ from: 'cyan.4', to: 'blue.5', deg: 135 }}
              style={{ position: 'relative', boxShadow: '0 0 40px var(--accent-glow)' }}>
              <Server size={34} />
            </ThemeIcon>
          </Box>
          <Title order={2} ta="center" c="var(--text-primary)" style={{ letterSpacing: '-0.02em' }}>
            Connect to MCP Server
          </Title>
          <Text size="sm" ta="center" c="dimmed" maw={340}>
            Spawn a local server process and start exploring tools and security posture
          </Text>
        </Stack>

        {/* Form */}
        <Card radius="xl" p="xl" bg="var(--bg-raised)" withBorder style={{ borderColor: 'var(--border-default)' }}>
          <Stack gap="lg">
            <div>
              <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed" mb={8}>Transport</Text>
              <Group gap="sm">
                <Card radius="md" p="sm" bg={transport === 'stdio' ? 'var(--accent-muted)' : 'var(--bg-surface)'}
                  withBorder style={{ borderColor: transport === 'stdio' ? 'var(--accent)' : 'var(--border-subtle)', cursor: 'pointer', flex: 1 }}
                  onClick={() => setTransport('stdio')}>
                  <Group gap="sm">
                    <ThemeIcon size={28} radius="sm" variant="light" color={transport === 'stdio' ? 'cyan' : 'gray'}>
                      <Terminal size={14} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm" fw={600} c="var(--text-primary)">stdio</Text>
                      <Text size="xs" c="dimmed">Local process</Text>
                    </div>
                  </Group>
                </Card>
                <Card radius="md" p="sm" bg={transport === 'streamable-http' ? 'var(--accent-muted)' : 'var(--bg-surface)'}
                  withBorder style={{ borderColor: transport === 'streamable-http' ? 'var(--accent)' : 'var(--border-subtle)', cursor: 'pointer', flex: 1 }}
                  onClick={() => setTransport('streamable-http')}>
                  <Group gap="sm">
                    <ThemeIcon size={28} radius="sm" variant="light" color={transport === 'streamable-http' ? 'cyan' : 'gray'}>
                      <Globe size={14} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm" fw={600} c="var(--text-primary)">Streamable HTTP</Text>
                      <Text size="xs" c="dimmed">Remote server</Text>
                    </div>
                  </Group>
                </Card>
              </Group>
            </div>

            {transport === 'stdio' ? (
              <>
                <TextInput
                  label="Command" placeholder="npx, node, python..."
                  value={command} onChange={(e) => setCommand(e.target.value)}
                  styles={{
                    label: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8 },
                    input: { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 12, height: 44 },
                  }}
                />
                <TextInput
                  label="Arguments" placeholder="path/to/server.ts"
                  value={args} onChange={(e) => setArgs(e.target.value)}
                  styles={{
                    label: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8 },
                    input: { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 12, height: 44 },
                  }}
                />
              </>
            ) : (
              <TextInput
                label="Server URL" placeholder="http://localhost:3000/mcp"
                value={httpUrl} onChange={(e) => setHttpUrl(e.target.value)}
                styles={{
                  label: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8 },
                  input: { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 12, height: 44 },
                }}
              />
            )}

            <Button
              fullWidth size="lg" radius="lg"
              variant="gradient" gradient={{ from: 'cyan.5', to: 'blue.5', deg: 135 }}
              leftSection={loading ? <Sparkles size={16} className="animate-spin" /> : <Zap size={16} />}
              onClick={onConnect} disabled={loading || connected || (transport === 'stdio' ? !command.trim() : !httpUrl.trim())}
              loading={loading} loaderProps={{ type: 'dots', color: 'white' }}
              styles={{ root: { height: 48, fontWeight: 600, boxShadow: '0 0 24px var(--accent-glow)' } }}
            >
              {loading ? 'Connecting...' : connected ? 'Connected' : 'Connect'}
            </Button>
          </Stack>
        </Card>

        <Text size="xs" ta="center" c="dimmed" mt="lg">
          Demo: <Code style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            test/fixtures/poisoned-server.ts
          </Code>
        </Text>
      </Box>
    </motion.div>
  );
}
