import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AppShell, NavLink, Card, Text, Badge, Button,
  Group, Stack, ThemeIcon, Box, Alert, Transition,
} from '@mantine/core';
import {
  Shield, Plug, Unplug, AlertCircle, Package, ScanLine, Monitor,
} from 'lucide-react';
import type { ServerCapabilities, ScanResult } from '@mcp-suite/shared';
import { api } from './services/api';
import ConnectionView from './views/ConnectionView';
import ToolsView from './views/ToolsView';
import SecurityView from './views/SecurityView';
import McpAppsView from './views/McpAppsView';

type View = 'connect' | 'tools' | 'security' | 'mcp-apps';

export default function App() {
  const [view, setView] = useState<View>('connect');
  const [capabilities, setCapabilities] = useState<ServerCapabilities | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [transport, setTransport] = useState<'stdio' | 'streamable-http'>('stdio');
  const [command, setCommand] = useState('npx');
  const [args, setArgs] = useState('tsx test/fixtures/poisoned-server.ts');
  const [httpUrl, setHttpUrl] = useState('http://localhost:3000/mcp');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);

  async function handleConnect() {
    setError(null); setLoading(true);
    try {
      const config = transport === 'stdio'
        ? { command, args: args.split(/\s+/), workingDirectory: undefined }
        : { url: httpUrl, auth: 'none' as const };

      const caps = await api.connect({
        id: 'poc', name: 'POC', transport,
        config,
        createdAt: new Date().toISOString(),
      });
      setCapabilities(caps); setConnected(true); setView('tools');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Connection failed'); }
    finally { setLoading(false); }
  }

  async function handleDisconnect() {
    try { await api.disconnect(); } catch { /* noop */ }
    setConnected(false); setCapabilities(null);
    setScanResult(null); setView('connect');
  }

  async function handleScan() {
    setScanning(true); setScanResult(null);
    try { setScanResult(await api.scan()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Scan failed'); }
    finally { setScanning(false); }
  }

  return (
    <AppShell
      navbar={{ width: 260, breakpoint: 0 }}
      styles={{
        root: { height: '100%' },
        main: { background: 'var(--bg-base)', minHeight: '100%' },
        navbar: { background: 'var(--bg-raised)', borderColor: 'var(--border-subtle)' },
      }}
    >
      {/* ── Sidebar ── */}
      <AppShell.Navbar p="md">
        <Stack h="100%" gap={0}>
          {/* Brand */}
          <Group gap="sm" mb="xl" px="xs">
            <ThemeIcon size={36} radius="md" variant="gradient" gradient={{ from: 'cyan.5', to: 'blue.5', deg: 135 }}>
              <Shield size={18} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={700} c="var(--text-primary)">MCP Suite</Text>
              <Text size="10px" fw={600} tt="uppercase" lts="0.12em" c="dimmed">Security</Text>
            </div>
          </Group>

          {/* Nav */}
          <Stack gap={4} flex={1}>
            <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed" px="sm" mb={4}>Menu</Text>
            <NavLink
              label="Connection" leftSection={<Plug size={16} />} active={view === 'connect'}
              onClick={() => setView('connect')} variant="filled"
              styles={{ root: { borderRadius: 12, color: view === 'connect' ? 'var(--accent)' : 'var(--text-tertiary)', background: view === 'connect' ? 'var(--accent-muted)' : 'transparent' } }}
            />
            <NavLink
              label="Tool Explorer" leftSection={<Package size={16} />} active={view === 'tools'}
              disabled={!connected} onClick={() => setView('tools')} variant="filled"
              rightSection={capabilities ? <Badge size="xs" variant="light" color="cyan" radius="sm">{capabilities.tools.length}</Badge> : null}
              styles={{ root: { borderRadius: 12, color: view === 'tools' ? 'var(--accent)' : 'var(--text-tertiary)', background: view === 'tools' ? 'var(--accent-muted)' : 'transparent' } }}
            />
            <NavLink
              label="Security Scan" leftSection={<ScanLine size={16} />} active={view === 'security'}
              disabled={!connected} onClick={() => setView('security')} variant="filled"
              rightSection={scanResult && scanResult.totalFindings > 0 ? <Badge size="xs" variant="light" color="red" radius="sm">{scanResult.totalFindings}</Badge> : null}
              styles={{ root: { borderRadius: 12, color: view === 'security' ? 'var(--accent)' : 'var(--text-tertiary)', background: view === 'security' ? 'var(--accent-muted)' : 'transparent' } }}
            />
            <NavLink
              label="MCP Apps" leftSection={<Monitor size={16} />} active={view === 'mcp-apps'}
              disabled={!connected} onClick={() => setView('mcp-apps')} variant="filled"
              styles={{ root: { borderRadius: 12, color: view === 'mcp-apps' ? 'var(--accent)' : 'var(--text-tertiary)', background: view === 'mcp-apps' ? 'var(--accent-muted)' : 'transparent' } }}
            />
          </Stack>

          {/* Connection status footer */}
          <Card radius="lg" p="sm" bg="var(--bg-surface)" withBorder style={{ borderColor: 'var(--border-subtle)' }}>
            {connected && capabilities ? (
              <Stack gap={6}>
                <Group gap={8}>
                  <Box w={8} h={8} style={{ borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }} />
                  <Text size="xs" fw={600} c="var(--text-primary)">{capabilities.serverInfo.name}</Text>
                </Group>
                <Group gap={8} ml={16}>
                  <Text size="10px" c="dimmed">v{capabilities.serverInfo.version}</Text>
                  <Text size="10px" c="dimmed">·</Text>
                  <Text size="10px" c="dimmed">{capabilities.tools.length} tools</Text>
                </Group>
                <Button
                  variant="subtle" size="compact-xs" color="red" leftSection={<Unplug size={11} />}
                  onClick={handleDisconnect} ml={12} mt={2} w="fit-content"
                  styles={{ root: { fontWeight: 500 } }}
                >
                  Disconnect
                </Button>
              </Stack>
            ) : (
              <Group gap={8}>
                <Box w={8} h={8} style={{ borderRadius: '50%', background: 'var(--text-muted)' }} />
                <Text size="xs" c="dimmed">No connection</Text>
              </Group>
            )}
          </Card>
        </Stack>
      </AppShell.Navbar>

      {/* ── Main ── */}
      <AppShell.Main>
        {/* Error banner */}
        <Transition mounted={!!error} transition="slide-down" duration={200}>
          {(styles) => (
            <Box style={styles} px="xl" pt="md">
              <Alert
                icon={<AlertCircle size={16} />} color="red" variant="light" radius="lg"
                withCloseButton onClose={() => setError(null)}
                styles={{ root: { background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.12)' } }}
              >
                {error}
              </Alert>
            </Box>
          )}
        </Transition>

        <Box h="100%" style={{ overflow: 'auto' }}>
          <AnimatePresence mode="wait">
            {view === 'connect' && (
              <ConnectionView key="conn"
                transport={transport} setTransport={setTransport}
                command={command} setCommand={setCommand}
                args={args} setArgs={setArgs}
                httpUrl={httpUrl} setHttpUrl={setHttpUrl}
                onConnect={handleConnect} loading={loading} connected={connected}
              />
            )}
            {view === 'tools' && capabilities && (
              <ToolsView key="tools" capabilities={capabilities} />
            )}
            {view === 'security' && (
              <SecurityView key="sec" scanResult={scanResult} scanning={scanning} onScan={handleScan} capabilities={capabilities} />
            )}
            {view === 'mcp-apps' && capabilities && (
              <McpAppsView key="apps" capabilities={capabilities} />
            )}
          </AnimatePresence>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
