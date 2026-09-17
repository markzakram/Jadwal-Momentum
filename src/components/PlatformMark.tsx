import Icon from "./Icon";
import { platformColor, platformIcon } from "@/lib/palette";

/**
 * Penanda platform: bentuk DAN warna, bukan warna saja.
 *
 * Sebelumnya tiap platform hanya diwakili kotak 7px berwarna. Sebelas warna
 * kategorikal memang sudah lolos pemeriksaan buta warna, tapi pada kotak sekecil
 * itu jarak warnanya nyaris tidak terpakai - mata membedakan bentuk jauh lebih
 * cepat daripada rona pada bidang 7 piksel.
 *
 * Ikonnya sengaja tidak diberi label: di semua tempat ia dipakai, nama
 * platformnya berdiri tepat di sebelahnya, jadi pembaca layar tidak perlu
 * mendengarnya dua kali.
 */
export default function PlatformMark({ platform, size = 13 }: { platform: string; size?: number }) {
  return (
    <span className="plat-mark" style={{ color: platformColor(platform) }}>
      <Icon name={platformIcon(platform)} size={size} />
    </span>
  );
}
