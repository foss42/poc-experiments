import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Card, Text, Group, Badge, Box, ThemeIcon, Stack, Tooltip } from '@mantine/core';
import { Monitor, Shield, ShieldCheck, ShieldX } from 'lucide-react';

interface IframePreviewProps {
  html: string;
  resourceUri: string;
  onLoad: () => void;
}

// All sandbox flags — we only enable allow-scripts, rest are blocked
const SANDBOX_FLAGS = [
  { flag: 'allow-scripts', enabled: true, reason: 'Required for UI interactivity (Chart.js, form handlers)' },
  { flag: 'allow-same-origin', enabled: false, reason: 'Blocked — prevents iframe from accessing host cookies, localStorage, and DOM' },
  { flag: 'allow-forms', enabled: false, reason: 'Blocked — prevents form submissions to external URLs' },
  { flag: 'allow-popups', enabled: false, reason: 'Blocked — prevents opening new windows or tabs' },
  { flag: 'allow-top-navigation', enabled: false, reason: 'Blocked — prevents iframe from navigating the parent page' },
  { flag: 'allow-modals', enabled: false, reason: 'Blocked — prevents alert(), confirm(), prompt() dialogs' },
];

const IframePreview = forwardRef<HTMLIFrameElement, IframePreviewProps>(
  ({ html, resourceUri, onLoad }, ref) => {
    const sandboxValue = SANDBOX_FLAGS.filter(f => f.enabled).map(f => f.flag).join(' ');

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <Card radius="xl" p={0} bg="var(--bg-raised)" withBorder style={{ borderColor: 'var(--border-default)', overflow: 'hidden' }}>
          {/* Sandbox header bar */}
          <Group px="md" py="xs" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <ThemeIcon size={20} radius="sm" variant="light" color="violet">
              <Monitor size={12} />
            </ThemeIcon>
            <Text size="xs" fw={600} c="var(--text-secondary)">Sandbox</Text>
            <Badge size="xs" variant="light" color="violet" radius="sm" tt="none">{resourceUri}</Badge>
            <Box flex={1} />
            <Badge size="xs" variant="light" color="green" radius="sm">
              <Group gap={4}><Shield size={9} /> sandboxed</Group>
            </Badge>
          </Group>

          {/* Sandbox flags strip */}
          <Box px="md" py={6} style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
            <Group gap={6} wrap="wrap">
              <Text size="10px" fw={700} tt="uppercase" lts="0.1em" c="dimmed" mr={2}>Flags:</Text>
              {SANDBOX_FLAGS.map(({ flag, enabled, reason }) => (
                <Tooltip key={flag} label={reason} position="bottom" withArrow multiline w={260}>
                  <Badge
                    size="xs" radius="sm" tt="none"
                    variant="light"
                    color={enabled ? 'green' : 'red'}
                    leftSection={enabled
                      ? <ShieldCheck size={10} style={{ marginRight: 2 }} />
                      : <ShieldX size={10} style={{ marginRight: 2 }} />
                    }
                    style={{ cursor: 'help' }}
                  >
                    {flag}
                  </Badge>
                </Tooltip>
              ))}
            </Group>
          </Box>

          <iframe
            ref={ref}
            sandbox={sandboxValue}
            srcDoc={html}
            onLoad={onLoad}
            style={{ width: '100%', height: 520, border: 'none', background: '#fff' }}
          />
        </Card>
      </motion.div>
    );
  }
);

IframePreview.displayName = 'IframePreview';
export default IframePreview;
