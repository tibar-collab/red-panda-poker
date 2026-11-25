import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PokerService } from '../poker.service';
import { Panda } from '../panda/panda';

@Component({
  selector: 'app-join',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Panda],
  styleUrl: './join.scss',
  template: `
    <form class="card" (ngSubmit)="submit()">
      <app-panda mood="idle" />
      <h1>Red Panda Poker</h1>
      <p class="sub">
        Raum <strong>{{ poker.room() }}</strong> – wie heißt du?
      </p>

      <label class="field">
        <span>Dein Name</span>
        <input
          name="name"
          [(ngModel)]="name"
          maxlength="30"
          autocomplete="nickname"
          placeholder="z. B. Tim"
          required
          autofocus
        />
      </label>

      <label class="check">
        <input type="checkbox" name="spectator" [(ngModel)]="spectator" />
        <span>Nur zuschauen (ohne eigene Karte)</span>
      </label>

      <button class="btn primary" type="submit" [disabled]="!name().trim()">Beitreten</button>
    </form>
  `,
})
export class Join {
  protected readonly poker = inject(PokerService);
  protected readonly name = signal(this.poker.name());
  protected readonly spectator = signal(this.poker.spectator());

  protected submit(): void {
    void this.poker.join(this.name(), this.spectator());
  }
}
