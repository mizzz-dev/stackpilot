import { Pressable, Text, View } from 'react-native';
import type { InspectorConnectionMode } from '@/repositories/inspector-repository';
import type { InspectorLoadStatus } from '@/hooks/use-inspector-snapshot';
import { colors } from '@/theme/colors';

interface ConnectionBannerProps {
  mode: InspectorConnectionMode;
  status: InspectorLoadStatus;
  errorMessage?: string;
  hasPairing: boolean;
  onReload: () => void;
  onPair: () => void;
  onDisconnect: () => void;
}

export const ConnectionBanner = ({
  mode,
  status,
  errorMessage,
  hasPairing,
  onReload,
  onPair,
  onDisconnect
}: ConnectionBannerProps) => {
  const isError = status === 'error';
  const title = isError
    ? '接続エラー'
    : mode === 'demo'
      ? 'デモモード'
      : status === 'loading'
        ? '接続中'
        : mode === 'paired'
          ? 'Desktopとペアリング済み'
          : '接続済み';
  const description = isError
    ? errorMessage ?? 'Inspectorデータを取得できませんでした。'
    : mode === 'demo'
      ? 'Desktopの「Mobile接続」からQRコードを読み取ると、実際の通信ログを確認できます。'
      : status === 'loading'
        ? 'Stackpilot Desktopから最新ログを取得しています。'
        : mode === 'paired'
          ? '同一LAN上のStackpilot Desktopから最新ログを取得しています。'
          : '設定済みInspector APIに接続しています。';
  const accent = isError ? colors.danger : mode === 'demo' ? colors.warning : colors.success;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        borderWidth: 1,
        borderColor: `${accent}80`,
        borderRadius: 14,
        backgroundColor: `${accent}14`,
        padding: 12,
        gap: 10,
        borderCurve: 'continuous'
      }}
    >
      <View style={{ gap: 3 }}>
        <Text selectable style={{ color: accent, fontSize: 13, fontWeight: '700' }}>
          {title}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          {description}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Inspectorデータを再読み込み"
          onPress={onReload}
          disabled={status === 'loading'}
          style={({ pressed }) => ({
            opacity: status === 'loading' ? 0.45 : pressed ? 0.7 : 1,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: colors.surfaceRaised,
            borderCurve: 'continuous'
          })}
        >
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
            {status === 'loading' ? '読込中' : '再読込'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onPair}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: colors.accent,
            borderCurve: 'continuous'
          })}
        >
          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
            {hasPairing ? '再ペアリング' : 'QRで接続'}
          </Text>
        </Pressable>

        {hasPairing ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDisconnect}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              borderWidth: 1,
              borderColor: `${colors.danger}80`,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: `${colors.danger}14`,
              borderCurve: 'continuous'
            })}
          >
            <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>接続解除</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};
