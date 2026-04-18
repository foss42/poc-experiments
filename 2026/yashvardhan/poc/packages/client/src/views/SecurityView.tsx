import { motion } from 'framer-motion';
import {
  Card, Text, Title, Badge, Button, Accordion, Code,
  Group, Stack, RingProgress, ThemeIcon, Box,
} from '@mantine/core';
import {
  AlertTriangle, AlertCircle, Info, CheckCircle2, Search,
  ShieldCheck, ShieldAlert, ScanLine, Activity,
} from 'lucide-react';
import type { ServerCapabilities, Finding, ScanResult } from '@mcp-suite/shared';

const SEVERITY_CONFIG: Record<string, { color: string; mantineColor: string; icon: React.ReactNode }> = {
  critical: { color: '#dc2626', mantineColor: 'red', icon: <AlertCircle size={14} /> },
  high:     { color: '#ef4444', mantineColor: 'red', icon: <AlertTriangle size={14} /> },
  medium:   { color: '#f59e0b', mantineColor: 'yellow', icon: <AlertTriangle size={14} /> },
  low:      { color: '#38bdf8', mantineColor: 'cyan', icon: <Info size={14} /> },
  info:     { color: '#71717a', mantineColor: 'gray', icon: <Info size={14} /> },
};

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

export default function SecurityView({ scanResult, scanning, onScan, capabilities }: {
  scanResult: ScanResult | null; scanning: boolean; onScan: () => void; capabilities: ServerCapabilities | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      <Box p="xl" maw={960} mx="auto">
        {/* Header */}
        <Group justify="space-between" mb="xl">
          <Group gap="md">
            <ThemeIcon size={48} radius="lg" variant="light" color="cyan">
              <ShieldCheck size={24} />
            </ThemeIcon>
            <div>
              <Title order={3} c="var(--text-primary)" style={{ letterSpacing: '-0.01em' }}>Security Analysis</Title>
              <Text size="sm" c="dimmed">Scan for tool poisoning, injection patterns, and misconfigurations</Text>
            </div>
          </Group>
          <Button
            variant="gradient" gradient={{ from: 'cyan.5', to: 'blue.5', deg: 135 }}
            radius="lg" size="md"
            leftSection={scanning ? null : <ScanLine size={16} />}
            onClick={onScan} disabled={scanning || !capabilities}
            loading={scanning} loaderProps={{ type: 'dots', color: 'white' }}
            styles={{ root: { fontWeight: 600, boxShadow: '0 0 20px var(--accent-glow)' } }}
          >
            {scanning ? 'Scanning...' : 'Run Scan'}
          </Button>
        </Group>

        {/* Empty state */}
        {!scanResult && !scanning && (
          <Card radius="xl" p={60} bg="var(--bg-raised)" withBorder
            style={{ borderColor: 'var(--border-subtle)', borderStyle: 'dashed', textAlign: 'center' }}>
            <Stack align="center" gap="md">
              <ThemeIcon size={64} radius="xl" variant="light" color="gray">
                <ShieldAlert size={30} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={500} c="dimmed">No scan results yet</Text>
                <Text size="xs" c="dimmed" mt={4}>Run a scan to analyze the connected server</Text>
              </div>
            </Stack>
          </Card>
        )}

        {scanResult && (
          <Stack gap="lg">
            {/* Score + Severity breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
              <ScoreRing score={scanResult.score} />
              <SeverityBreakdown counts={scanResult.severityCounts} total={scanResult.totalFindings} />
            </div>

            {/* Findings */}
            <div>
              <Group gap="sm" mb="md">
                <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed">
                  <Group gap={6}><AlertTriangle size={11} /> Findings</Group>
                </Text>
                <Badge size="xs" variant="light" color="gray" radius="sm">{scanResult.totalFindings}</Badge>
              </Group>

              {scanResult.findings.length === 0 ? (
                <Card radius="xl" p={48} bg="rgba(34,197,94,0.06)" style={{ border: '1px solid rgba(34,197,94,0.12)', textAlign: 'center' }}>
                  <CheckCircle2 size={32} style={{ color: '#4ade80', margin: '0 auto 8px' }} />
                  <Text size="sm" fw={600} style={{ color: '#4ade80' }}>All clear</Text>
                  <Text size="xs" style={{ color: '#22c55e' }} mt={2}>No security issues detected</Text>
                </Card>
              ) : (
                <Accordion
                  variant="separated" radius="lg"
                  styles={{
                    item: { background: 'var(--bg-raised)', borderColor: 'var(--border-subtle)', '&[data-active]': { borderColor: 'var(--border-strong)' } },
                    control: { padding: '16px 20px', '&:hover': { background: 'var(--bg-surface-hover)' } },
                    content: { padding: '0 20px 20px' },
                  }}
                >
                  {scanResult.findings.map((f, i) => (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <FindingItem finding={f} />
                    </motion.div>
                  ))}
                </Accordion>
              )}
            </div>
          </Stack>
        )}
      </Box>
    </motion.div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const mantineColor = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';
  const label = score >= 80 ? 'Secure' : score >= 50 ? 'At Risk' : 'Critical';
  const glow = score >= 80 ? 'rgba(34,197,94,0.12)' : score >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';

  return (
    <Card radius="xl" p="lg" bg="var(--bg-raised)" withBorder
      style={{ borderColor: 'var(--border-default)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${glow}` }}>
      <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed" mb="sm">Security Score</Text>
      <RingProgress
        size={140} thickness={10} roundCaps
        sections={[{ value: score, color }]}
        label={
          <Stack align="center" gap={0}>
            <Text size="28px" fw={800} style={{ color, lineHeight: 1 }}>{score}</Text>
            <Text size="xs" c="dimmed">/ 100</Text>
          </Stack>
        }
      />
      <Badge mt="sm" variant="light" color={mantineColor} radius="md" size="sm" fw={700}>
        {label}
      </Badge>
    </Card>
  );
}

function SeverityBreakdown({ counts, total }: { counts: Record<string, number>; total: number }) {
  return (
    <Card radius="xl" p="lg" bg="var(--bg-raised)" withBorder style={{ borderColor: 'var(--border-default)' }}>
      <Group justify="space-between" mb="lg">
        <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed">
          <Group gap={6}><Activity size={11} /> Severity Breakdown</Group>
        </Text>
        <Text size="xs" c="dimmed">{total} findings</Text>
      </Group>
      <Stack gap="md" justify="center" flex={1}>
        {SEVERITY_ORDER.map((key) => {
          const count = counts[key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const cfg = SEVERITY_CONFIG[key];
          return (
            <Group key={key} gap="sm" wrap="nowrap">
              <Group gap={8} w={80} justify="flex-end" wrap="nowrap">
                <Box w={7} h={7} style={{ borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                <Text size="xs" fw={500} c="dimmed" style={{ textTransform: 'capitalize' }}>{key}</Text>
              </Group>
              <Box flex={1} h={7} style={{ borderRadius: 99, background: 'var(--bg-overlay)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 99, background: cfg.color }}
                />
              </Box>
              <Text size="xs" fw={700} w={24} ta="right" style={{ color: count > 0 ? cfg.color : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {count}
              </Text>
            </Group>
          );
        })}
      </Stack>
    </Card>
  );
}

function FindingItem({ finding }: { finding: Finding }) {
  const cfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.info;

  return (
    <Accordion.Item value={finding.id}>
      <Accordion.Control>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={32} radius="md" variant="light" color={cfg.mantineColor}>
            {cfg.icon}
          </ThemeIcon>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={600} c="var(--text-primary)">{finding.title}</Text>
            <Group gap={8} mt={2}>
              {finding.toolName && (
                <Badge size="xs" variant="light" color="gray" radius="sm" tt="none">
                  {finding.toolName}
                </Badge>
              )}
              <Badge size="xs" variant="light" color={cfg.mantineColor} radius="sm" tt="uppercase">
                {finding.severity}
              </Badge>
            </Group>
          </div>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="md">
          <Text size="sm" c="dimmed" lh={1.7}>{finding.description}</Text>

          {finding.evidence && (
            <div>
              <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed" mb={8}>
                <Group gap={6}><Search size={10} /> Evidence</Group>
              </Text>
              <Code block
                styles={{
                  root: {
                    background: `${cfg.color}10`,
                    color: cfg.color,
                    borderRadius: 12,
                    padding: 16,
                    border: `1px solid ${cfg.color}22`,
                    fontSize: 12,
                  },
                }}
              >
                {finding.evidence}
              </Code>
            </div>
          )}

          {finding.remediation && (
            <div>
              <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed" mb={8}>
                <Group gap={6}><CheckCircle2 size={10} /> Remediation</Group>
              </Text>
              <Card radius="md" p="md" bg="var(--accent-muted)" style={{ border: '1px solid rgba(56,189,248,0.12)' }}>
                <Group gap="sm" align="flex-start" wrap="nowrap">
                  <CheckCircle2 size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                  <Text size="sm" lh={1.7} style={{ color: 'var(--accent-dark)' }}>{finding.remediation}</Text>
                </Group>
              </Card>
            </div>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
