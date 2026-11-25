import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { Join } from './join/join';
import { PokerService } from './poker.service';
import { Room } from './room/room';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Join, Room],
  template: `
    @if (poker.joined()) {
      <app-room />
    } @else {
      <app-join />
    }
  `,
})
export class App {
  protected readonly poker = inject(PokerService);

  constructor() {
    this.poker.readRoomFromUrl();
  }

  /** Raumwechsel über die URL (…/#/anderer-raum). */
  @HostListener('window:hashchange')
  protected async onHashChange(): Promise<void> {
    const before = this.poker.room();
    this.poker.readRoomFromUrl();
    if (this.poker.room() !== before && this.poker.joined()) {
      const { name, spectator } = { name: this.poker.name(), spectator: this.poker.spectator() };
      await this.poker.leave();
      await this.poker.join(name, spectator);
    }
  }
}
