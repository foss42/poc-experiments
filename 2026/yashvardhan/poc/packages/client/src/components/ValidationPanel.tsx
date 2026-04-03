import { Card, Text, Group, Stack, ThemeIcon } from '@mantine/core';
import { CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';
import type { AppApiCheck } from '@mcp-suite/shared';

const STATUS_ICON: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />,
  fail: <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />,
  pending: <Clock size={16} style={{ color: '#9a9ab0', flexShrink: 0 }} />,
  'not-applicable': <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>—</Text>,
};

const STATUS_COLOR: Record<string, string> = {
  pass: '#22c55e',
  fail: '#ef4444',
  pending: 'var(--text-secondary)',
  'not-applicable': 'var(--text-muted)',
};

export default function ValidationPanel({ checks }: { checks: AppApiCheck[] }) {
  return (
    <Card radius="xl" p="lg" bg="var(--bg-raised)" withBorder style={{ borderColor: 'var(--border-default)' }}>
      <Group gap="sm" mb="md">
        <ThemeIcon size={24} radius="sm" variant="light" color="green">
          <Shield size={14} />
        </ThemeIcon>
        <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed">App API Validation</Text>
      </Group>
      <Stack gap={8}>
        {checks.map((check) => (
          <Group key={check.name} gap="sm" wrap="nowrap">
            {STATUS_ICON[check.status]}
            <div style={{ minWidth: 0 }}>
              <Text size="xs" fw={600} style={{ color: STATUS_COLOR[check.status] }}>{check.name}</Text>
              <Text size="10px" c="dimmed" lineClamp={1}>{check.description}</Text>
            </div>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
