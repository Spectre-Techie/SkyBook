"use client";

import { CaretDown, Check } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type AirportDirectoryItem,
  formatAirportLabel,
} from "@/lib/reference/airport-labels";

type AirportComboboxProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: AirportDirectoryItem[];
  placeholder?: string;
  required?: boolean;
  className?: string;
};

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatPrimaryOptionLabel(option: AirportDirectoryItem): string {
  return `${option.city} - ${option.airportName} - ${option.iataCode}`;
}

export function AirportCombobox({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  className,
}: AirportComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) => {
        const cityOrder = a.city.localeCompare(b.city);
        if (cityOrder !== 0) {
          return cityOrder;
        }

        return a.iataCode.localeCompare(b.iataCode);
      }),
    [options],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(value);

    if (!normalizedQuery) {
      return sortedOptions.slice(0, 12);
    }

    return sortedOptions
      .filter((option) => {
        const haystack = normalizeSearchText(
          `${option.iataCode} ${option.city} ${option.airportName} ${option.country}`,
        );

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 12);
  }, [sortedOptions, value]);

  const highlightedIndex =
    filteredOptions.length === 0
      ? -1
      : Math.min(Math.max(activeIndex, 0), filteredOptions.length - 1);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  function handleSelect(option: AirportDirectoryItem) {
    onChange(formatAirportLabel(option.iataCode));
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      setActiveIndex((previous) => {
        if (filteredOptions.length === 0) {
          return -1;
        }

        if (previous < 0 || previous >= filteredOptions.length - 1) {
          return 0;
        }

        return previous + 1;
      });

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      setActiveIndex((previous) => {
        if (filteredOptions.length === 0) {
          return -1;
        }

        if (previous <= 0) {
          return filteredOptions.length - 1;
        }

        return previous - 1;
      });

      return;
    }

    if (event.key === "Enter" && isOpen && highlightedIndex >= 0) {
      event.preventDefault();
      const selected = filteredOptions[highlightedIndex];
      if (selected) {
        handleSelect(selected);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className={className} ref={rootRef}>
      <label className="space-y-2 text-sm text-text-muted" htmlFor={id}>
        {label}
        <div className="relative">
          <input
            ref={inputRef}
            id={id}
            className="field pr-11"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setIsOpen(true);
              setActiveIndex(0);
            }}
            onFocus={() => {
              setIsOpen(true);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => {
              setIsOpen((previous) => {
                const nextOpen = !previous;
                if (nextOpen) {
                  setActiveIndex(0);
                }

                return nextOpen;
              });
              inputRef.current?.focus();
            }}
            className="focus-ring absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition hover:bg-surface-muted hover:text-text-default"
            aria-label={isOpen ? "Hide airport suggestions" : "Show airport suggestions"}
            title={isOpen ? "Hide airport suggestions" : "Show airport suggestions"}
          >
            <CaretDown size={16} weight="bold" />
          </button>

          {isOpen ? (
            <div
              className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-border-default bg-surface-raised p-1 shadow-[var(--shadow-md)]"
            >
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-text-muted">
                  No airports found. Try city, airport name, or IATA code.
                </p>
              ) : (
                filteredOptions.map((option, index) => {
                  const isActive = index === highlightedIndex;
                  const isSelected =
                    normalizeSearchText(value) ===
                    normalizeSearchText(formatAirportLabel(option.iataCode));

                  return (
                    <button
                      key={option.iataCode}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelect(option)}
                      className={`focus-ring flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
                        isActive
                          ? "bg-[var(--primary-50)] text-text-default"
                          : "text-text-default hover:bg-surface-muted"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          {formatPrimaryOptionLabel(option)}
                        </span>
                        <span className="block text-xs text-text-muted">
                          {option.country}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check
                          size={16}
                          weight="bold"
                          className="mt-0.5 shrink-0 text-[var(--primary-700)]"
                        />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      </label>
    </div>
  );
}
