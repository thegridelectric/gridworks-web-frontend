import { DateTime } from 'luxon';
import { useState, useEffect } from 'react';

export function useTimer(milliseconds: number) {
  const [date, setDate] = useState(DateTime.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDate(DateTime.now());
    }, milliseconds);

    return () => clearInterval(intervalId);
  }, []);

  return date;
}
