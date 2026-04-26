import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card, Text, Title, Badge, Button, TextInput, NavLink,
  Group, Stack, Code, Divider, ThemeIcon, Box,
} from '@mantine/core';
import {
  Wrench, FileText, MessageSquare, Search, Clock, Sparkles,
  Activity, ChevronRight, Play,
} from 'lucide-react';
import type { ServerCapabilities, ToolInfo, InvokeResponse } from '@mcp-suite/shared';
import { api } from '../services/api';
import { parseToolArgs } from '../utils/parseToolArgs';

export default function ToolsView({ capabilities }: { capabilities: ServerCapabilities }) {
  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, string>>({});
  const [invokeResult, setInvokeResult] = useState<InvokeResponse | null>(null);
  const [invoking, setInvoking] = useState(false);

  function handleSelectTool(tool: ToolInfo) {
    setSelectedTool(tool);
    setInvokeResult(null);
    setToolArgs({});
  }

  async function handleInvoke() {
    if (!selectedTool) return;
    setInvoking(true); setInvokeResult(null);
    try {
      const props = (selectedTool.inputSchema?.properties ?? {}) as Record<string, { type?: string }>;
      const parsed = parseToolArgs(toolArgs, props);
      setInvokeResult(await api.invoke(selectedTool.name, parsed));
    } catch (e: unknown) {
      setInvokeResult({ result: e instanceof Error ? e.message : 'Error', isError: true, latencyMs: 0 });
    } finally { setInvoking(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', height: '100%' }}
    >
      {/* Explorer sidebar */}
      <Box w={280} style={{ flexShrink: 0, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-raised)', overflow: 'auto' }}>
        <Box px="md" py="sm" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed">Server Explorer</Text>
        </Box>

        <Stack gap={0} py="xs">
          {/* Tools section */}
          <Group px="md" py={6} gap={6}>
            <Wrench size={12} style={{ color: 'var(--accent)' }} />
            <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="dimmed" flex={1}>Tools</Text>
            <Badge size="xs" variant="light" color="cyan" radius="sm">{capabilities.tools.length}</Badge>
          </Group>
          {capabilities.tools.map(tool => (
            <NavLink key={tool.name}
              label={<Text size="sm" fw={selectedTool?.name === tool.name ? 600 : 400} truncate>{tool.name}</Text>}
              active={selectedTool?.name === tool.name}
              onClick={() => handleSelectTool(tool)}
              leftSection={<Box w={5} h={5} style={{ borderRadius: '50%', background: selectedTool?.name === tool.name ? 'var(--accent)' : 'var(--text-muted)' }} />}
              rightSection={selectedTool?.name === tool.name ? <ChevronRight size={14} style={{ color: 'var(--accent)' }} /> : null}
              styles={{
                root: {
                  borderRadius: 0,
                  borderLeft: selectedTool?.name === tool.name ? '2px solid var(--accent)' : '2px solid transparent',
                  background: selectedTool?.name === tool.name ? 'var(--accent-muted)' : 'transparent',
                  color: selectedTool?.name === tool.name ? 'var(--accent)' : 'var(--text-secondary)',
                },
              }}
            />
          ))}

          {/* Resources */}
          {capabilities.resources.length > 0 && (
            <>
              <Divider my="xs" color="var(--border-subtle)" />
              <Group px="md" py={6} gap={6}>
                <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="dimmed" flex={1}>Resources</Text>
                <Badge size="xs" variant="light" color="gray" radius="sm">{capabilities.resources.length}</Badge>
              </Group>
              {capabilities.resources.map(r => (
                <Box key={r.uri} px="md" py={6}>
                  <Text size="xs" c="dimmed" truncate>{r.name}</Text>
                </Box>
              ))}
            </>
          )}

          {/* Prompts */}
          {capabilities.prompts.length > 0 && (
            <>
              <Divider my="xs" color="var(--border-subtle)" />
              <Group px="md" py={6} gap={6}>
                <MessageSquare size={12} style={{ color: 'var(--text-muted)' }} />
                <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="dimmed" flex={1}>Prompts</Text>
                <Badge size="xs" variant="light" color="gray" radius="sm">{capabilities.prompts.length}</Badge>
              </Group>
              {capabilities.prompts.map(p => (
                <Box key={p.name} px="md" py={6}>
                  <Text size="xs" c="dimmed" truncate>{p.name}</Text>
                </Box>
              ))}
            </>
          )}
        </Stack>
      </Box>

      {/* Detail pane */}
      <Box flex={1} style={{ overflow: 'auto' }}>
        {!selectedTool ? (
          <Stack align="center" justify="center" h="100%" gap="md">
            <ThemeIcon size={64} radius="xl" variant="light" color="gray">
              <Search size={28} />
            </ThemeIcon>
            <div style={{ textAlign: 'center' }}>
              <Text size="sm" fw={500} c="dimmed">Select a tool to inspect</Text>
              <Text size="xs" c="dimmed" mt={4}>Choose from the explorer panel</Text>
            </div>
          </Stack>
        ) : (
          <motion.div key={selectedTool.name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
            <Box p="xl" maw={680}>
              {/* Tool header */}
              <Group gap="md" mb="xl">
                <ThemeIcon size={48} radius="lg" variant="light" color="cyan">
                  <Wrench size={22} />
                </ThemeIcon>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Title order={3} c="var(--text-primary)" style={{ letterSpacing: '-0.01em' }}>{selectedTool.name}</Title>
                  {selectedTool.description && (
                    <Text size="sm" c="dimmed" mt={4} lineClamp={3}>{selectedTool.description}</Text>
                  )}
                </div>
              </Group>

              {/* Parameters */}
              <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed" mb="sm">
                <Group gap={6}><Sparkles size={11} /> Parameters</Group>
              </Text>
              <Stack gap="sm" mb="xl">
                {Object.entries(
                  (selectedTool.inputSchema?.properties ?? {}) as Record<string, { type?: string; description?: string }>
                ).map(([name, schema]) => {
                  const required = ((selectedTool.inputSchema?.required ?? []) as string[]).includes(name);
                  return (
                    <Card key={name} radius="lg" p="md" bg="var(--bg-raised)" withBorder style={{ borderColor: 'var(--border-subtle)' }}>
                      <Group gap="sm" mb={schema.description ? 'xs' : 'sm'}>
                        <Text size="sm" fw={600} c="var(--text-primary)">{name}</Text>
                        <Badge size="xs" variant="light" color="cyan" radius="sm" tt="none">
                          {schema.type ?? 'any'}
                        </Badge>
                        {required && <Badge size="xs" variant="light" color="red" radius="sm">required</Badge>}
                      </Group>
                      {schema.description && (
                        <Text size="xs" c="dimmed" mb="sm" lineClamp={2}>{schema.description}</Text>
                      )}
                      <TextInput
                        placeholder={`Enter ${name}...`}
                        value={toolArgs[name] ?? ''} onChange={(e) => setToolArgs({ ...toolArgs, [name]: e.target.value })}
                        styles={{
                          input: { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 10 },
                        }}
                      />
                    </Card>
                  );
                })}
              </Stack>

              <Button
                variant="gradient" gradient={{ from: 'cyan.5', to: 'blue.5', deg: 135 }}
                radius="lg" size="md"
                leftSection={invoking ? null : <Play size={15} />}
                onClick={handleInvoke} disabled={invoking} loading={invoking}
                loaderProps={{ type: 'dots', color: 'white' }}
                styles={{ root: { fontWeight: 600, boxShadow: '0 0 20px var(--accent-glow)' } }}
              >
                {invoking ? 'Running...' : 'Invoke Tool'}
              </Button>

              {/* Response */}
              <AnimatePresence>
                {invokeResult && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Box mt="xl">
                      <Group gap="sm" mb="sm">
                        <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed">
                          <Group gap={6}><Activity size={11} /> Response</Group>
                        </Text>
                        <Badge size="xs" variant="light" color={invokeResult.isError ? 'red' : 'green'} radius="sm">
                          {invokeResult.isError ? 'ERROR' : 'SUCCESS'}
                        </Badge>
                        <Group gap={4}>
                          <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                          <Text size="xs" c="dimmed">{invokeResult.latencyMs}ms</Text>
                        </Group>
                      </Group>
                      <Code block
                        styles={{
                          root: {
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            borderRadius: 16,
                            padding: 20,
                            border: '1px solid var(--border-default)',
                            maxHeight: 420,
                            overflow: 'auto',
                            fontSize: 12,
                          },
                        }}
                      >
                        {JSON.stringify(invokeResult.result, null, 2)}
                      </Code>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
}
