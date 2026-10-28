import { describe, expect, it } from 'vitest';
import elm from './fixtures/elm-snapshot.spaceheat-003.json';
import registryExample from './fixtures/registry-example-snapshot.spaceheat-003.json';
import { SingleMachineState } from '../types/SingleMachineState';
import { SingleReading } from '../types/SingleReading';
import { SnapshotSpaceheat } from '../types/SnapshotSpaceheat';

const fixtures = [
    ['elm, captured off the house broker 2026-10-28', elm],
    ['the registry example', registryExample],
] as const;

function firstPath(result: { success: false; error: { issues: { path: PropertyKey[] }[] } }): string {
    return result.error.issues[0].path.join('.');
}

describe('snapshot.spaceheat 003', () => {
    it.each(fixtures)('parses %s', (_name, instance) => {
        const parsed = SnapshotSpaceheat.parse(instance);
        expect(parsed.TypeName).toBe('snapshot.spaceheat');
        expect(parsed.LatestReadingList.length).toBe(instance.LatestReadingList.length);
    });

    it.each(fixtures)('round-trips %s unchanged', (_name, instance) => {
        const once = SnapshotSpaceheat.parse(instance);
        const twice = SnapshotSpaceheat.parse(JSON.parse(JSON.stringify(once)));
        expect(twice).toEqual(instance);
    });

    it('rejects a wrong TypeName, naming the path', () => {
        const result = SnapshotSpaceheat.safeParse({ ...elm, TypeName: 'snapshot.spacehead' });
        expect(result.success).toBe(false);
        if (!result.success) expect(firstPath(result)).toBe('TypeName');
    });

    it('rejects a wrong Version, naming the path', () => {
        const result = SnapshotSpaceheat.safeParse({ ...elm, Version: '002' });
        expect(result.success).toBe(false);
        if (!result.success) expect(firstPath(result)).toBe('Version');
    });

    it('rejects a missing required field, naming the path', () => {
        const { FromGNodeInstanceId: _dropped, ...rest } = elm;
        void _dropped;
        const result = SnapshotSpaceheat.safeParse(rest);
        expect(result.success).toBe(false);
        if (!result.success) expect(firstPath(result)).toBe('FromGNodeInstanceId');
    });

    it('rejects a field the word does not declare', () => {
        const result = SnapshotSpaceheat.safeParse({ ...elm, Extra: 1 });
        expect(result.success).toBe(false);
    });

    it('rejects a value of the wrong primitive type, with no coercion', () => {
        const result = SnapshotSpaceheat.safeParse({ ...elm, SnapshotTimeUnixMs: String(elm.SnapshotTimeUnixMs) });
        expect(result.success).toBe(false);
        if (!result.success) expect(firstPath(result)).toBe('SnapshotTimeUnixMs');
    });

    it('rejects a reading whose value is not an integer, naming the list path', () => {
        const readings = [{ ...elm.LatestReadingList[0], Value: 29.98 }];
        const result = SnapshotSpaceheat.safeParse({ ...elm, LatestReadingList: readings });
        expect(result.success).toBe(false);
        if (!result.success) expect(firstPath(result)).toBe('LatestReadingList.0.Value');
    });
});

describe('single.reading 000', () => {
    const reading = elm.LatestReadingList[0];

    it('parses a fleet reading', () => {
        expect(SingleReading.parse(reading)).toEqual(reading);
    });

    it('rejects a channel name outside spaceheat.name', () => {
        const result = SingleReading.safeParse({ ...reading, ChannelName: 'Hp-EWT' });
        expect(result.success).toBe(false);
        if (!result.success) expect(firstPath(result)).toBe('ChannelName');
    });

    it('rejects a read time before the utc.milliseconds range', () => {
        const result = SingleReading.safeParse({ ...reading, ScadaReadTimeUnixMs: 0 });
        expect(result.success).toBe(false);
        if (!result.success) expect(firstPath(result)).toBe('ScadaReadTimeUnixMs');
    });
});

describe('single.machine.state 000', () => {
    const state = registryExample.LatestStateList[0];

    it('parses the registry example', () => {
        expect(SingleMachineState.parse(state)).toEqual(state);
    });

    it('parses fleet states with and without a Cause; the gateway drops a null one', () => {
        const withCause = elm.LatestStateList.filter((s) => 'Cause' in s);
        const withoutCause = elm.LatestStateList.filter((s) => !('Cause' in s));
        expect(withCause.length).toBeGreaterThan(0);
        expect(withoutCause.length).toBeGreaterThan(0);
        for (const s of elm.LatestStateList) {
            expect(SingleMachineState.parse(s)).toEqual(s);
        }
    });

    it('rejects a null Cause: an optional string is absent, never null', () => {
        const result = SingleMachineState.safeParse({ ...state, Cause: null });
        expect(result.success).toBe(false);
        if (!result.success) expect(firstPath(result)).toBe('Cause');
    });

    it('fails axiom 1 for a relay state outside relay.closed.or.open', () => {
        const result = SingleMachineState.safeParse({ ...state, State: 'Closed' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstPath(result)).toBe('State');
            expect(result.error.issues[0].message).toMatch(/^Axiom 1 \(RecognizedStateEnumConsistency\) failed/);
        }
    });
});
