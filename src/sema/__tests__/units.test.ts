import { describe, expect, it } from 'vitest';
import { Unit } from '../enums/Unit';
import { SpaceheatTelemetryName } from '../enums/SpaceheatTelemetryName';
import { projectUnit } from '../types/UnitQuantityProjection';
import { projectTelemetryName } from '../types/SpaceheatTelemetryQuantityProjection';
import { UNIT_CONVERSIONS, UNIT_HOVER_FORMATS, getHoverTemplate, getValueConverter, toDisplayValue } from '../units';

const DISPLAYED_QUANTITIES = new Set(['Temperature', 'FlowRate', 'Power', 'Energy']);

describe('the unit table', () => {
    it('has a conversion and a hover format for every temperature, flow, power and energy telemetry name', () => {
        for (const name of SpaceheatTelemetryName.options) {
            if (DISPLAYED_QUANTITIES.has(projectTelemetryName(name))) {
                expect(UNIT_CONVERSIONS[name], name).toBeDefined();
                expect(UNIT_HOVER_FORMATS[name], name).toBeDefined();
            }
        }
    });

    it('has a conversion and a hover format for every temperature, flow, power and energy unit', () => {
        for (const unit of Unit.options) {
            if (DISPLAYED_QUANTITIES.has(projectUnit(unit))) {
                expect(UNIT_CONVERSIONS[unit], unit).toBeDefined();
                expect(UNIT_HOVER_FORMATS[unit], unit).toBeDefined();
            }
        }
    });

    it('displays elm hp-ewt at 2998 CelsiusTimes100 as 86.0 F', () => {
        expect(toDisplayValue('CelsiusTimes100', 2998)).toBeCloseTo(85.96, 2);
    });

    it('displays elm tank1-depth1 at 10441 FahrenheitX100 as 104.4 F', () => {
        expect(toDisplayValue('FahrenheitX100', 10441)).toBeCloseTo(104.41, 2);
    });

    it('displays a beech reading at 29980 WaterTempCTimes1000 as 86.0 F', () => {
        expect(toDisplayValue('WaterTempCTimes1000', 29980)).toBeCloseTo(85.96, 2);
    });

    it('has no display value for a unit outside the table', () => {
        expect(toDisplayValue('RelayState', 1)).toBeUndefined();
        expect(toDisplayValue('', 1)).toBeUndefined();
    });

    it('keeps the visualizer converter and hover template behaviour', () => {
        expect(getValueConverter('PowerW', 1)(4560)).toBeCloseTo(4.56, 3);
        expect(getValueConverter('Unitless', 2)(3)).toBe(6);
        expect(getHoverTemplate('CelsiusTimes100')).toBe('%{x|%H:%M:%S} | %{y:.1f}°F<extra></extra>');
        expect(getHoverTemplate('RelayState', 2)).toBe('%{x|%H:%M:%S} | %{y}/2<extra></extra>');
    });
});
