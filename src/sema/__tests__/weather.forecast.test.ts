import { describe, expect, it } from 'vitest';
import mooseBundle from './fixtures/moose-gw.weather.forecast.bundle.gt-002.json';
import mooseForecast001 from './fixtures/moose-gw.weather.forecast-001.json';
import mooseForecast002 from './fixtures/moose-gw.weather.forecast-002.json';
import { AnyWeatherForecast } from '../types/AnyWeatherForecast';
import { WeatherForecast } from '../types/WeatherForecast';
import { WeatherForecast001 } from '../types/old_versions/WeatherForecast001';
import { WeatherForecastBundleGt } from '../types/WeatherForecastBundleGt';
import { WeatherForecastChannelGt } from '../types/WeatherForecastChannelGt';
import { WeatherChannelGt } from '../types/WeatherChannelGt';
import { WeatherForecastSeries } from '../types/WeatherForecastSeries';
import { forecastRuns } from '../../visualizer/weather-api';

/** The registry's gw.weather.forecast 002 example. */
const forecast = {
    ForecastUid: '5f1c2b3a-8d4e-4f60-9a7b-1c2d3e4f5a6b',
    BundleName: 'us.me.millinocket.raccoon',
    MessageCreatedMs: 1792094460033,
    FirstSliceStart: '2026-10-15T21:00:00Z',
    SeriesList: [
        {
            ChannelName: 'kmlt.temperature.forecast.nws.hourly',
            Quantity: 'Temperature',
            Values: [512, 498],
            Fidelity: 'Live',
            SourceUpdatedTime: '2026-10-15T20:01:57Z',
            TypeName: 'gw.weather.forecast.series',
            Version: '000',
        },
        {
            ChannelName: 'kmlt.windspeed.forecast.nws.hourly',
            Quantity: 'WindSpeed',
            Values: [60, 70],
            Fidelity: 'Live',
            SourceUpdatedTime: '2026-10-15T20:01:57Z',
            TypeName: 'gw.weather.forecast.series',
            Version: '000',
        },
        {
            ChannelName: 'kmlt.irradiance.forecast.openmeteo.hourly',
            Quantity: 'Irradiance',
            Values: [120, 35],
            Fidelity: 'Stored',
            SourceUpdatedTime: '2026-10-15T20:00:00Z',
            TypeName: 'gw.weather.forecast',
            Version: '001',
        },
    ],
    TypeName: 'gw.weather.forecast',
    Version: '002',
};
// The registry example's third series carries the parent's TypeName; a
// word-shaped series is what the service emits.
forecast.SeriesList[2].TypeName = 'gw.weather.forecast.series';
forecast.SeriesList[2].Version = '000';

const temperature = forecast.SeriesList[0];

describe('gw.weather.forecast 002 and 001', () => {
    it('parses the registry example and the journaled moose emissions at each version', () => {
        expect(WeatherForecast.parse(forecast)).toEqual(forecast);
        expect(WeatherForecast.parse(mooseForecast002)).toEqual(mooseForecast002);
        expect(WeatherForecast001.parse(mooseForecast001)).toEqual(mooseForecast001);
        expect(AnyWeatherForecast.array().parse([mooseForecast001, mooseForecast002])).toEqual([mooseForecast001, mooseForecast002]);
    });

    it('rejects a 002 without its ForecastUid and a 001 with one', () => {
        const { ForecastUid, ...without } = forecast;
        expect(WeatherForecast.safeParse(without).success).toBe(false);
        expect(AnyWeatherForecast.safeParse({ ...mooseForecast001, ForecastUid }).success).toBe(false);
    });

    it('decodes an unknown fidelity to the default', () => {
        const parsed = WeatherForecast.parse({
            ...forecast,
            SeriesList: [{ ...temperature, Fidelity: 'Guessed' }],
        });
        expect(parsed.SeriesList[0].Fidelity).toBe('Unknown');
    });

    it('fails each axiom', () => {
        expect(WeatherForecast.safeParse({ ...forecast, SeriesList: [] }).success).toBe(false);
        expect(
            WeatherForecast.safeParse({ ...forecast, SeriesList: [temperature, { ...forecast.SeriesList[1], Values: [60] }] })
                .success,
        ).toBe(false);
        expect(
            WeatherForecast.safeParse({ ...forecast, SeriesList: [temperature, { ...temperature, Quantity: 'WindSpeed' }] })
                .success,
        ).toBe(false);
        expect(
            WeatherForecast.safeParse({
                ...forecast,
                SeriesList: [temperature, { ...temperature, ChannelName: 'kmlt.temperature.forecast.nws.hourly96' }],
            }).success,
        ).toBe(false);
    });
});

describe('gw.weather.forecast.series 000', () => {
    it('fails each axiom', () => {
        expect(WeatherForecastSeries.safeParse({ ...temperature, Values: [] }).success).toBe(false);
        expect(WeatherForecastSeries.safeParse({ ...temperature, ChannelName: 'kmlt.temperature.nws' }).success).toBe(false);
        expect(WeatherForecastSeries.safeParse({ ...temperature, ChannelName: 'forecast.kmlt' }).success).toBe(false);
    });
});

describe('gw.weather.forecast.bundle.gt 002', () => {
    const binding = mooseBundle.BindingList[0];
    const forecastChannel = binding.ForecastChannel;
    const observationChannel = binding.ObservationChannel;

    it('parses the journaled moose record', () => {
        expect(WeatherForecastBundleGt.parse(mooseBundle)).toEqual(mooseBundle);
    });

    it('fails each bundle axiom', () => {
        const other = {
            ...binding,
            ForecastChannel: { ...forecastChannel, Name: 'kmlt.temperature.forecast.nws.hourly96' },
        };
        const wind = {
            ...binding,
            ForecastChannel: {
                ...forecastChannel,
                Name: 'kmlt.windspeed.forecast.nws.hourly96',
                TargetChannelName: 'kmlt.windspeed',
            },
            ObservationChannel: { ...observationChannel, Name: 'kmlt.windspeed', Quantity: 'WindSpeed' },
        };
        expect(WeatherForecastBundleGt.safeParse({ ...mooseBundle, BindingList: [] }).success).toBe(false);
        expect(
            WeatherForecastBundleGt.safeParse({
                ...mooseBundle,
                BindingList: [
                    binding,
                    {
                        ...wind,
                        ForecastChannel: {
                            ...wind.ForecastChannel,
                            SliceDurationSList: Array(48).fill(7200),
                            TotalSlices: 48,
                        },
                    },
                ],
            }).success,
        ).toBe(false);
        expect(WeatherForecastBundleGt.safeParse({ ...mooseBundle, EmitOffsetS: mooseBundle.EmitPeriodS }).success).toBe(false);
        expect(WeatherForecastBundleGt.safeParse({ ...mooseBundle, BindingList: [binding, binding] }).success).toBe(false);
        expect(WeatherForecastBundleGt.safeParse({ ...mooseBundle, BindingList: [binding, other] }).success).toBe(false);
        expect(WeatherForecastBundleGt.safeParse({ ...mooseBundle, Name: 'us.me.millinocket.moo.se' }).success).toBe(false);
        expect(WeatherForecastBundleGt.safeParse({ ...mooseBundle, BindingList: [binding, wind] }).success).toBe(true);
    });

    it('fails the binding and channel axioms', () => {
        expect(
            WeatherForecastBundleGt.safeParse({
                ...mooseBundle,
                BindingList: [{ ...binding, ForecastChannel: { ...forecastChannel, TargetChannelName: 'kmlt.windspeed' } }],
            }).success,
        ).toBe(false);
        expect(WeatherForecastChannelGt.safeParse({ ...forecastChannel, TotalSlices: 95 }).success).toBe(false);
        expect(WeatherForecastChannelGt.safeParse({ ...forecastChannel, ForecastDurationMinutes: 5759 }).success).toBe(false);
        expect(
            WeatherForecastChannelGt.safeParse({
                ...forecastChannel,
                SliceDurationSList: [...forecastChannel.SliceDurationSList.slice(0, 95), 3601],
                ForecastDurationMinutes: 5760 + 1 / 60,
            }).success,
        ).toBe(false);
        expect(WeatherForecastChannelGt.safeParse({ ...forecastChannel, Name: 'kmlt.temperature.nws.hourly' }).success).toBe(false);
        expect(WeatherChannelGt.safeParse({ ...observationChannel, Name: 'kmlt.temp' }).success).toBe(false);
        expect(WeatherChannelGt.safeParse({ ...observationChannel, EmitOffsetS: 3600 }).success).toBe(false);
    });
});

describe('forecastRuns', () => {
    const bundle = WeatherForecastBundleGt.parse(mooseBundle);
    const emission = WeatherForecast001.parse(mooseForecast001);

    it('lays a run on the slice grid in the bound channel unit, oldest first', () => {
        const earlier = { ...emission, MessageCreatedMs: emission.MessageCreatedMs - 3600_000 };
        const later = WeatherForecast.parse(mooseForecast002);
        const runs = forecastRuns(bundle, [later, emission, earlier], 'Temperature');
        expect(runs).not.toBeNull();
        expect(runs!.unit).toBe('FahrenheitX10');
        expect(runs!.runs.map((r) => r.createdMs)).toEqual([earlier.MessageCreatedMs, emission.MessageCreatedMs, later.MessageCreatedMs]);
        const run = runs!.runs[1];
        const firstS = Date.parse(emission.FirstSliceStart) / 1000;
        expect(run.sliceStartsS.slice(0, 3)).toEqual([firstS, firstS + 3600, firstS + 7200]);
        expect(run.sliceStartsS).toHaveLength(96);
        expect(run.values).toEqual(emission.SeriesList[0].Values);
    });

    it('has no runs for a quantity the bundle does not bind', () => {
        expect(forecastRuns(bundle, [emission], 'Irradiance')).toBeNull();
    });
});
