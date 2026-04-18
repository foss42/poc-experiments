import { useState } from 'react';
import { Card, Text, Group, Stack, Badge, Code, ScrollArea, ThemeIcon } from '@mantine/core';
import { ArrowUpRight, ArrowDownLeft, MessageSquare } from 'lucide-react';
import type { JsonRpcLogEntry } from '@mcp-suite/shared';

function MessageLogItem({ entry }: { entry: JsonRpcLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isIncoming = entry.direction === 'iframe-to-host';

  return (
    <Card
      radius="md" p="xs" bg="var(--bg-surface)"
      style={{ borderLeft: `3px solid ${isIncoming ? '#8b5cf6' : '#0ea5e9'}`, cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
    >
      <Group gap={6} wrap="nowrap">
        {isIncoming
          ? <ArrowDownLeft size={12} style={{ color: '#8b5cf6', flexShrink: 0 }} />
          : <ArrowUpRight size={12} style={{ color: '#0ea5e9', flexShrink: 0 }} />
        }
        <Badge size="xs" variant="light" color={isIncoming ? 'violet' : 'cyan'} radius="sm" tt="none" style={{ flexShrink: 0 }}>
          {isIncoming ? 'IN' : 'OUT'}
        </Badge>
        <Text size="xs" fw={600} c="var(--text-primary)" truncate style={{ flex: 1 }}>
          {entry.method ?? 'response'}
        </Text>
        {!entry.isValid && (
          <Badge size="xs" variant="light" color="red" radius="sm">invalid</Badge>
        )}
        <Text size="10px" c="dimmed" style={{ flexShrink: 0 }}>
          {new Date(entry.timestamp).toLocaleTimeString()}
        </Text>
      </Group>
      {expanded && (
        <Code block mt={6} styles={{ root: { fontSize: 10, borderRadius: 8, maxHeight: 200, overflow: 'auto', background: 'var(--bg-base)' } }}>
          {JSON.stringify(entry.payload, null, 2)}
        </Code>
      )}
    </Card>
  );
}

export default function MessageLog({ entries }: { entries: JsonRpcLogEntry[] }) {
  return (
    <Card radius="xl" p="lg" bg="var(--bg-raised)" withBorder style={{ borderColor: 'var(--border-default)' }}>
      <Group gap="sm" mb="md" justify="space-between">
        <Group gap="sm">
          <ThemeIcon size={24} radius="sm" variant="light" color="cyan">
            <MessageSquare size={14} />
          </ThemeIcon>
          <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed">JSON-RPC Message Log</Text>
        </Group>
        {entries.length > 0 && (
          <Badge size="xs" variant="light" color="gray" radius="sm">{entries.length}</Badge>
        )}
      </Group>

      <ScrollArea h={400} type="auto" offsetScrollbars>
        {entries.length === 0 ? (
          <Stack align="center" py="xl" gap="xs">
            <MessageSquare size={24} style={{ color: 'var(--text-muted)' }} />
            <Text size="xs" c="dimmed">No messages yet. Invoke a tool to start.</Text>
          </Stack>
        ) : (
          <Stack gap={6}>
            {entries.map((entry) => (
              <MessageLogItem key={entry.id} entry={entry} />
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Card>
  );
}
