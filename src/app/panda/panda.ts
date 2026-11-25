import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PandaMood = 'idle' | 'waiting' | 'reveal' | 'happy';

/**
 * Das Maskottchen: ein roter Panda als Inline-SVG.
 *  - idle:    entspannt, blinzelt ab und zu
 *  - waiting: schaut neugierig hin und her (es wird geschätzt)
 *  - reveal:  große Augen (Karten sind aufgedeckt)
 *  - happy:   freut sich (alle sind sich einig)
 */
@Component({
  selector: 'app-panda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"mood-" + mood()' },
  styleUrl: './panda.scss',
  template: `
    <svg viewBox="0 0 220 190" role="img" [attr.aria-label]="label()">
      <g class="bob">
        <!-- Ohren -->
        <g class="ear ear-l">
          <path d="M28 70 C 18 30, 40 8, 70 22 C 66 40, 52 60, 28 70 Z" fill="var(--panda-rust)" />
          <path d="M36 60 C 30 36, 44 22, 62 28 C 58 40, 50 52, 36 60 Z" fill="var(--panda-white)" />
          <path d="M42 54 C 40 40, 47 32, 56 33 C 54 42, 49 49, 42 54 Z" fill="var(--panda-dark)" />
        </g>
        <g class="ear ear-r">
          <path d="M192 70 C 202 30, 180 8, 150 22 C 154 40, 168 60, 192 70 Z" fill="var(--panda-rust)" />
          <path d="M184 60 C 190 36, 176 22, 158 28 C 162 40, 170 52, 184 60 Z" fill="var(--panda-white)" />
          <path d="M178 54 C 180 40, 173 32, 164 33 C 166 42, 171 49, 178 54 Z" fill="var(--panda-dark)" />
        </g>

        <!-- Kopf -->
        <path
          d="M110 30 C 170 30, 204 66, 204 106 C 204 150, 164 180, 110 180 C 56 180, 16 150, 16 106 C 16 66, 50 30, 110 30 Z"
          fill="var(--panda-orange)"
        />
        <!-- Wangen -->
        <path d="M18 112 C 22 92, 44 88, 60 104 C 62 128, 44 150, 30 146 C 22 138, 17 126, 18 112 Z" fill="var(--panda-white)" />
        <path d="M202 112 C 198 92, 176 88, 160 104 C 158 128, 176 150, 190 146 C 198 138, 203 126, 202 112 Z" fill="var(--panda-white)" />
        <!-- Augenbrauen-Flecken -->
        <ellipse cx="76" cy="70" rx="14" ry="9" fill="var(--panda-white)" transform="rotate(-12 76 70)" />
        <ellipse cx="144" cy="70" rx="14" ry="9" fill="var(--panda-white)" transform="rotate(12 144 70)" />
        <!-- Tränenstreifen -->
        <path d="M66 86 C 58 100, 60 122, 74 140 C 82 130, 90 112, 86 92 Z" fill="var(--panda-rust)" />
        <path d="M154 86 C 162 100, 160 122, 146 140 C 138 130, 130 112, 134 92 Z" fill="var(--panda-rust)" />
        <!-- Schnauze -->
        <path d="M110 104 C 140 104, 156 122, 152 142 C 148 162, 128 170, 110 170 C 92 170, 72 162, 68 142 C 64 122, 80 104, 110 104 Z" fill="var(--panda-white)" />

        <!-- Augen -->
        <g class="eyes">
          @switch (mood()) {
            @case ('happy') {
              <path d="M66 98 Q 77 86 88 98" class="eye-line" />
              <path d="M132 98 Q 143 86 154 98" class="eye-line" />
            }
            @case ('reveal') {
              <circle cx="77" cy="98" r="11" fill="var(--panda-dark)" />
              <circle cx="143" cy="98" r="11" fill="var(--panda-dark)" />
              <circle cx="81" cy="94" r="4" fill="#fff" />
              <circle cx="147" cy="94" r="4" fill="#fff" />
            }
            @default {
              <g class="pupils">
                <ellipse class="eye" cx="77" cy="98" rx="8" ry="9" fill="var(--panda-dark)" />
                <ellipse class="eye" cx="143" cy="98" rx="8" ry="9" fill="var(--panda-dark)" />
                <circle cx="80" cy="95" r="2.6" fill="#fff" />
                <circle cx="146" cy="95" r="2.6" fill="#fff" />
              </g>
            }
          }
        </g>

        <!-- Nase & Mund -->
        <path d="M98 118 C 98 112, 122 112, 122 118 C 122 126, 114 130, 110 130 C 106 130, 98 126, 98 118 Z" fill="var(--panda-dark)" />
        @switch (mood()) {
          @case ('happy') {
            <path d="M94 140 Q 110 162 126 140 Z" fill="var(--panda-dark)" />
            <path d="M101 147 Q 110 156 119 147 Q 110 151 101 147 Z" fill="#e8798a" />
          }
          @case ('reveal') {
            <ellipse cx="110" cy="146" rx="7" ry="8" fill="var(--panda-dark)" />
          }
          @default {
            <path d="M110 130 L 110 138 M 110 138 Q 101 146 93 140 M 110 138 Q 119 146 127 140" class="mouth" />
          }
        }
        @if (mood() === 'happy') {
          <ellipse cx="52" cy="128" rx="10" ry="6" fill="#f3a0a0" opacity=".6" />
          <ellipse cx="168" cy="128" rx="10" ry="6" fill="#f3a0a0" opacity=".6" />
        }
      </g>
    </svg>
  `,
})
export class Panda {
  readonly mood = input<PandaMood>('idle');

  protected label() {
    switch (this.mood()) {
      case 'waiting':
        return 'Roter Panda wartet gespannt auf die Schätzungen';
      case 'reveal':
        return 'Roter Panda staunt über die aufgedeckten Karten';
      case 'happy':
        return 'Roter Panda freut sich: alle sind sich einig';
      default:
        return 'Roter Panda';
    }
  }
}
