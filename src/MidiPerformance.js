import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { referenceClockLabel, referenceClockSourceClass, referenceClockSourceLabel } from './midi-model';
import './MidiPerformance.css';

export default function MidiPerformance({ api = typeof window !== 'undefined' ? window.vasio : undefined }) {
    const [midi, setMidi] = useState(null);
    const [error, setError] = useState('');
    const refresh = useCallback(async () => {
        if (!api?.getMidi) return;
        try { setMidi(await api.getMidi()); setError(''); }
        catch (failure) { setError(failure.message || 'MIDI performance is unavailable'); }
    }, [api]);
    useEffect(() => {
        refresh();
        const timer = window.setInterval(refresh, 1000);
        return () => window.clearInterval(timer);
    }, [refresh]);

    const clockPorts = useMemo(() => (midi?.ports || []).filter(port => port.source && port.clock &&
        (port.clock.running || port.clock.ticks > 0)), [midi]);
    const reference = midi?.referenceClock;
    const engineClock = midi?.engineClock;
    if (error) return <section className="section midi-performance" role="tabpanel" aria-label="MIDI performance"><p className="error-panel">{error}</p></section>;
    if (!midi) return <section className="section midi-performance" role="tabpanel" aria-label="MIDI performance"><p>Loading MIDI timing…</p></section>;
    return <section className="section midi-performance" role="tabpanel" aria-label="MIDI performance">
        <div className="midi-performance-heading"><div><h2>MIDI timing</h2>
            <p className="hint">MIDI 1.0 clock observations measured on the audio reference timebase.</p></div>
            <span className={`midi-reference-badge ${referenceClockSourceClass(reference)}`}>{referenceClockSourceLabel(reference)}</span></div>
        <div className="performance-metrics midi-reference-metrics">
            <div className="performance-metric primary"><span>Reference</span><strong>{reference?.source === 'asio' ? 'ASIO' : reference?.source === 'software' ? 'Software' : 'None'}</strong></div>
            <div className="performance-metric"><span>Nominal rate</span><strong>{reference?.nominalSampleRate ? `${reference.nominalSampleRate} Hz` : '—'}</strong></div>
            <div className="performance-metric"><span>Measured rate</span><strong>{reference?.measuredSampleRate ? `${reference.measuredSampleRate.toFixed(2)} Hz` : '—'}</strong></div>
            <div className="performance-metric"><span>Reference drift</span><strong>{typeof reference?.driftPpm === 'number' ? `${reference.driftPpm >= 0 ? '+' : '−'}${Math.abs(reference.driftPpm).toFixed(1)} ppm` : '—'}</strong></div>
            <div className="performance-metric"><span>Measurement span</span><strong>{reference?.measuredOverSeconds ? `${reference.measuredOverSeconds.toFixed(1)} s` : '—'}</strong></div>
        </div>
        <p className="hint midi-reference-explanation">{referenceClockLabel(reference)}. This is the audio reference versus the Windows performance counter; it is not Traktor phase drift.</p>
        <h3>Incoming MIDI clocks</h3>
        {clockPorts.length === 0 ? <p>No incoming MIDI clock observed yet.</p> :
            <div className="midi-clock-table-wrap"><table className="midi-clock-table"><thead><tr><th>Port</th><th>Status</th><th>BPM</th><th>Ticks</th><th>Echo</th></tr></thead>
                <tbody>{clockPorts.map(port => <tr key={port.id}><th scope="row">{port.name}</th>
                    <td>{port.clock.running ? 'Running' : 'Seen, stopped'}</td>
                    <td className="midi-bpm-reading">{typeof port.clock.bpm === 'number' ? port.clock.bpm.toFixed(2) : '—'}</td>
                    <td>{port.clock.ticks ?? 0}</td><td>{port.clock.echoSuspected ? 'Possible' : 'No'}</td></tr>)}</tbody>
            </table></div>}
        <p className="hint">Engine clock: {engineClock?.running ? 'sending' : 'not sending'} · MIDI ticks use 24 pulses per quarter note.</p>
    </section>;
}
