import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseDebouncedSearchOptions {
  /**
   * The URL parameter name to store the search value
   * @default 'search'
   */
  paramName?: string;
  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  delay?: number;
}

interface UseDebouncedSearchReturn {
  /**
   * The current input value (for controlled input)
   */
  inputValue: string;
  /**
   * Handler for input onChange events
   */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * The current search value from URL params
   */
  searchValue: string;
  /**
   * Clear the search input and URL param
   */
  clear: () => void;
}

/**
 * Custom hook for debounced search with URL parameter synchronization.
 * Manages local input state and updates URL search params after a debounce delay.
 */
export function useDebouncedSearch(
  options: UseDebouncedSearchOptions = {}
): UseDebouncedSearchReturn {
  const { paramName = 'search', delay = 300 } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const searchValue = searchParams.get(paramName) || '';
  const [inputValue, setInputValue] = React.useState(searchValue);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search with proper cleanup
  const debouncedSearch = React.useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set(paramName, value);
        } else {
          params.delete(paramName);
        }
        params.set('page', '1'); // Reset to first page on search
        setSearchParams(params);
      }, delay);
    },
    [searchParams, setSearchParams, paramName, delay]
  );

  // Cleanup debounce timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      debouncedSearch(e.target.value);
    },
    [debouncedSearch]
  );

  const clear = React.useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setInputValue('');
    const params = new URLSearchParams(searchParams);
    params.delete(paramName);
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams, paramName]);

  return {
    inputValue,
    handleChange,
    searchValue,
    clear,
  };
}

export default useDebouncedSearch;
