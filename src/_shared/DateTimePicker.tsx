interface DateTimePickerProps {
    value: Date;
    onChange?: (value: Date) => void;
    className: string;
}

function formatDate(dt: Date) {
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(dt: Date) {
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}


export default function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {

    function onDateChange(evt: React.ChangeEvent<HTMLInputElement, Element>) {
        const dateText = evt.currentTarget.value;
        if (dateText) {
            const result = new Date();
            const [year, month, day] = dateText.split('-');
            result.setFullYear(parseInt(year));
            result.setMonth(parseInt(month) - 1);
            result.setDate(parseInt(day));
            result.setHours(value.getHours());
            result.setMinutes(value.getMinutes());
            onChange?.(result);
        }
    }

    function onTimeChange(evt: React.ChangeEvent<HTMLInputElement, Element>) {
        const timeText = evt.currentTarget.value;
        if (timeText) {
            const result = new Date();
            result.setFullYear(value.getFullYear());
            result.setMonth(value.getMonth());
            result.setDate(value.getDate());
            const [hours, minutes] = timeText.split(':');
            result.setHours(parseInt(hours));
            result.setMinutes(parseInt(minutes));
            onChange?.(result);
        }
    }

    return <>
        <input type="date" className={className}
            value={formatDate(value)} onChange={onDateChange}></input>

        <input type="time" className={className}
            value={formatTime(value)}
            onChange={onTimeChange} />
    </>;
}
