/* eslint-disable */
import * as React from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'
import { unstable_composeClasses as composeClasses } from '@material-ui/unstyled'
import { alpha } from '@material-ui/system'
import Popper from '@material-ui/core/Popper'
import ListSubheader from '@material-ui/core/ListSubheader'
import Paper from '@material-ui/core/Paper'
import IconButton from '@material-ui/core/IconButton'
import Chip from '@material-ui/core/Chip'
import ClearIcon from '@material-ui/core/internal/svg-icons/Close'
import ArrowDropDownIcon from '@material-ui/core/internal/svg-icons/ArrowDropDown'
import useThemeProps from '@material-ui/core/styles/useThemeProps'
import styled from '@material-ui/core/styles/styled'
import autocompleteClasses, { getAutocompleteUtilityClass } from '@material-ui/core/Autocomplete/autocompleteClasses'
import capitalize from '@material-ui/core/utils/capitalize'
import {
  chainPropTypes, integerPropType,
  unstable_setRef as setRef,
  unstable_useEventCallback as useEventCallback,
  unstable_useControlled as useControlled,
  unstable_useId as useId,
} from '@material-ui/utils';

// https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
// Give up on IE11 support for this feature
function stripDiacritics (string) {
  return typeof string.normalize !== 'undefined'
    ? string.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : string
}

export function createFilterOptions (config = {}) {
  const {
    ignoreAccents = true,
    ignoreCase = true,
    limit,
    matchFrom = 'any',
    stringify,
    trim = false
  } = config

  return (options, { inputValue, getOptionLabel }) => {
    let input = trim ? inputValue.trim() : inputValue
    if (ignoreCase) {
      input = input.toLowerCase()
    }
    if (ignoreAccents) {
      input = stripDiacritics(input)
    }

    const filteredOptions = options.filter((option) => {
      let candidate = (stringify || getOptionLabel)(option)
      if (ignoreCase) {
        candidate = candidate.toLowerCase()
      }
      if (ignoreAccents) {
        candidate = stripDiacritics(candidate)
      }

      return matchFrom === 'start' ? candidate.indexOf(input) === 0 : candidate.indexOf(input) > -1
    })

    return typeof limit === 'number' ? filteredOptions.slice(0, limit) : filteredOptions
  }
}

// To replace with .findIndex() once we stop IE11 support.
function findIndex (array, comp) {
  for (let i = 0; i < array.length; i += 1) {
    if (comp(array[i])) {
      return i
    }
  }

  return -1
}

const defaultFilterOptions = createFilterOptions()

// Number of options to jump in list box when pageup and pagedown keys are used.
const pageSize = 5

const useAutocomplete = props => {
  const {
    autoComplete = false,
    autoHighlight = false,
    autoSelect = false,
    blurOnSelect = false,
    disabled: disabledProp,
    clearOnBlur = !props.freeSolo,
    clearOnEscape = false,
    componentName = 'useAutocomplete',
    defaultValue = props.multiple ? [] : null,
    disableClearable = false,
    disableCloseOnSelect = false,
    disabledItemsFocusable = false,
    disableListWrap = false,
    filterOptions = defaultFilterOptions,
    filterSelectedOptions = false,
    freeSolo = false,
    getOptionDisabled,
    getOptionLabel: getOptionLabelProp = (option) => option.label ?? option,
    isOptionEqualToValue = (option, value) => option === value,
    groupBy,
    handleHomeEndKeys = !props.freeSolo,
    id: idProp,
    includeInputInList = false,
    inputValue: inputValueProp,
    multiple = false,
    onChange,
    onClose,
    onHighlightChange,
    onInputChange,
    onOpen,
    open: openProp,
    openOnFocus = false,
    options,
    selectOnFocus = !props.freeSolo,
    value: valueProp
  } = props

  const id = useId(idProp)

  let getOptionLabel = getOptionLabelProp

  getOptionLabel = (option) => {
    const optionLabel = getOptionLabelProp(option)
    if (typeof optionLabel !== 'string') {
      if (process.env.NODE_ENV !== 'production') {
        const erroneousReturn =
          optionLabel === undefined ? 'undefined' : `${typeof optionLabel} (${optionLabel})`
        console.error(
          `Material-UI: The \`getOptionLabel\` method of ${componentName} returned ${erroneousReturn} instead of a string for ${JSON.stringify(
            option
          )}.`
        )
      }
      return String(optionLabel)
    }
    return optionLabel
  }

  const ignoreFocus = React.useRef(false)
  const firstFocus = React.useRef(true)
  const inputRef = React.useRef(null)
  const listboxRef = React.useRef(null)
  const [anchorEl, setAnchorEl] = React.useState(null)

  const [focusedTag, setFocusedTag] = React.useState(-1)
  const defaultHighlighted = autoHighlight ? 0 : -1
  const highlightedIndexRef = React.useRef(defaultHighlighted)

  const [value, setValueState] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: componentName
  })
  const [inputValue, setInputValueState] = useControlled({
    controlled: inputValueProp,
    default: '',
    name: componentName,
    state: 'inputValue'
  })

  const [focused, setFocused] = React.useState(false)

  const resetInputValue = React.useCallback(
    (event, newValue) => {
      let newInputValue
      if (multiple) {
        newInputValue = ''
      } else if (newValue == null) {
        newInputValue = ''
      } else {
        const optionLabel = getOptionLabel(newValue)
        newInputValue = typeof optionLabel === 'string' ? optionLabel : ''
      }

      if (inputValue === newInputValue) {
        return
      }

      setInputValueState(newInputValue)

      if (onInputChange) {
        onInputChange(event, newInputValue, 'reset')
      }
    },
    [getOptionLabel, inputValue, multiple, onInputChange, setInputValueState]
  )

  const prevValue = React.useRef()

  React.useEffect(() => {
    const valueChange = value !== prevValue.current
    prevValue.current = value

    if (focused && !valueChange) {
      return
    }

    if (!focused && !clearOnBlur) {
      return
    }

    resetInputValue(null, value)
  }, [value, resetInputValue, focused, prevValue])

  const [open, setOpenState] = useControlled({
    controlled: openProp,
    default: false,
    name: componentName,
    state: 'open'
  })

  const [inputPristine, setInputPristine] = React.useState(true)

  const inputValueIsSelectedValue =
    !multiple && value != null && inputValue === getOptionLabel(value)

  const popupOpen = open

  const filteredOptions = popupOpen
    ? filterOptions(
      options.filter((option) => {
        if (
          filterSelectedOptions &&
            (multiple ? value : [value]).some(
              (value2) => value2 !== null && isOptionEqualToValue(option, value2)
            )
        ) {
          return false
        }
        return true
      }),
      // we use the empty string to manipulate `filterOptions` to not filter any options
      // i.e. the filter predicate always returns true
      {
        inputValue: inputValueIsSelectedValue && inputPristine ? '' : inputValue,
        getOptionLabel
      }
    )
    : []

  const listboxAvailable = open && filteredOptions.length > 0

  if (process.env.NODE_ENV !== 'production') {
    if (value !== null && !freeSolo && options.length > 0) {
      const missingValue = (multiple ? value : [value]).filter(
        (value2) => !options.some((option) => isOptionEqualToValue(option, value2))
      )

      if (missingValue.length > 0) {
        console.warn(
          [
            `Material-UI: The value provided to ${componentName} is invalid.`,
            `None of the options match with \`${
              missingValue.length > 1
                ? JSON.stringify(missingValue)
                : JSON.stringify(missingValue[0])
            }\`.`,
            'You can use the `isOptionEqualToValue` prop to customize the equality test.'
          ].join('\n')
        )
      }
    }
  }

  const focusTag = useEventCallback((tagToFocus) => {
    if (tagToFocus === -1) {
      inputRef.current.focus()
    } else {
      anchorEl.querySelector(`[data-tag-index="${tagToFocus}"]`).focus()
    }
  })

  // Ensure the focusedTag is never inconsistent
  React.useEffect(() => {
    if (multiple && focusedTag > value.length - 1) {
      setFocusedTag(-1)
      focusTag(-1)
    }
  }, [value, multiple, focusedTag, focusTag])

  function validOptionIndex (index, direction) {
    if (!listboxRef.current || index === -1) {
      return -1
    }

    let nextFocus = index

    while (true) {
      // Out of range
      if (
        (direction === 'next' && nextFocus === filteredOptions.length) ||
        (direction === 'previous' && nextFocus === -1)
      ) {
        return -1
      }

      const option = listboxRef.current.querySelector(`[data-option-index="${nextFocus}"]`)

      // Same logic as MenuList.js
      const nextFocusDisabled = disabledItemsFocusable
        ? false
        : !option || option.disabled || option.getAttribute('aria-disabled') === 'true'

      if ((option && !option.hasAttribute('tabindex')) || nextFocusDisabled) {
        // Move to the next element.
        nextFocus += direction === 'next' ? 1 : -1
      } else {
        return nextFocus
      }
    }
  }

  const setHighlightedIndex = useEventCallback(({ event, index, reason = 'auto' }) => {
    highlightedIndexRef.current = index

    // does the index exist?
    if (index === -1) {
      inputRef.current.removeAttribute('aria-activedescendant')
    } else {
      inputRef.current.setAttribute('aria-activedescendant', `${id}-option-${index}`)
    }

    if (onHighlightChange) {
      onHighlightChange(event, index === -1 ? null : filteredOptions[index], reason)
    }

    if (!listboxRef.current) {
      return
    }

    const prev = listboxRef.current.querySelector('[role="option"].Mui-focused')
    if (prev) {
      prev.classList.remove('Mui-focused')
      prev.classList.remove('Mui-focusVisible')
    }

    const listboxNode = listboxRef.current.parentElement.querySelector('[role="listbox"]')

    // "No results"
    if (!listboxNode) {
      return
    }

    if (index === -1) {
      listboxNode.scrollTop = 0
      return
    }

    const option = listboxRef.current.querySelector(`[data-option-index="${index}"]`)

    if (!option) {
      return
    }

    option.classList.add('Mui-focused')
    if (reason === 'keyboard') {
      option.classList.add('Mui-focusVisible')
    }

    // Scroll active descendant into view.
    // Logic copied from https://www.w3.org/TR/wai-aria-practices/examples/listbox/js/listbox.js
    //
    // Consider this API instead once it has a better browser support:
    // .scrollIntoView({ scrollMode: 'if-needed', block: 'nearest' });
    if (listboxNode.scrollHeight > listboxNode.clientHeight && reason !== 'mouse') {
      const element = option

      const scrollBottom = listboxNode.clientHeight + listboxNode.scrollTop
      const elementBottom = element.offsetTop + element.offsetHeight
      if (elementBottom > scrollBottom) {
        listboxNode.scrollTop = elementBottom - listboxNode.clientHeight
      } else if (
        element.offsetTop - element.offsetHeight * (groupBy ? 1.3 : 0) <
        listboxNode.scrollTop
      ) {
        listboxNode.scrollTop = element.offsetTop - element.offsetHeight * (groupBy ? 1.3 : 0)
      }
    }
  })

  const changeHighlightedIndex = useEventCallback(
    ({ event, diff, direction = 'next', reason = 'auto' }) => {
      if (!popupOpen) {
        return
      }

      const getNextIndex = () => {
        const maxIndex = filteredOptions.length - 1

        if (diff === 'reset') {
          return defaultHighlighted
        }

        if (diff === 'start') {
          return 0
        }

        if (diff === 'end') {
          return maxIndex
        }

        const newIndex = highlightedIndexRef.current + diff

        if (newIndex < 0) {
          if (newIndex === -1 && includeInputInList) {
            return -1
          }

          if ((disableListWrap && highlightedIndexRef.current !== -1) || Math.abs(diff) > 1) {
            return 0
          }

          return maxIndex
        }

        if (newIndex > maxIndex) {
          if (newIndex === maxIndex + 1 && includeInputInList) {
            return -1
          }

          if (disableListWrap || Math.abs(diff) > 1) {
            return maxIndex
          }

          return 0
        }

        return newIndex
      }

      const nextIndex = validOptionIndex(getNextIndex(), direction)
      setHighlightedIndex({ index: nextIndex, reason, event })

      // Sync the content of the input with the highlighted option.
      if (autoComplete && diff !== 'reset') {
        if (nextIndex === -1) {
          inputRef.current.value = inputValue
        } else {
          const option = getOptionLabel(filteredOptions[nextIndex])
          inputRef.current.value = option

          // The portion of the selected suggestion that has not been typed by the user,
          // a completion string, appears inline after the input cursor in the textbox.
          const index = option.toLowerCase().indexOf(inputValue.toLowerCase())
          if (index === 0 && inputValue.length > 0) {
            inputRef.current.setSelectionRange(inputValue.length, option.length)
          }
        }
      }
    }
  )

  const syncHighlightedIndex = React.useCallback(() => {
    if (!popupOpen) {
      return
    }

    const valueItem = multiple ? value[0] : value

    // The popup is empty, reset
    if (filteredOptions.length === 0 || valueItem == null) {
      changeHighlightedIndex({ diff: 'reset' })
      return
    }

    if (!listboxRef.current) {
      return
    }

    // Synchronize the value with the highlighted index
    if (valueItem != null) {
      const currentOption = filteredOptions[highlightedIndexRef.current]

      // Keep the current highlighted index if possible
      if (
        multiple &&
        currentOption &&
        findIndex(value, (val) => isOptionEqualToValue(currentOption, val)) !== -1
      ) {
        return
      }

      const itemIndex = findIndex(filteredOptions, (optionItem) =>
        isOptionEqualToValue(optionItem, valueItem)
      )
      if (itemIndex === -1) {
        changeHighlightedIndex({ diff: 'reset' })
      } else {
        setHighlightedIndex({ index: itemIndex })
      }
      return
    }

    // Prevent the highlighted index to leak outside the boundaries.
    if (highlightedIndexRef.current >= filteredOptions.length - 1) {
      setHighlightedIndex({ index: filteredOptions.length - 1 })
      return
    }

    // Restore the focus to the previous index.
    setHighlightedIndex({ index: highlightedIndexRef.current })
    // Ignore filteredOptions (and options, isOptionEqualToValue, getOptionLabel) not to break the scroll position
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Only sync the highlighted index when the option switch between empty and not
    filteredOptions.length,
    // Don't sync the highlighted index with the value when multiple
    // eslint-disable-next-line react-hooks/exhaustive-deps
    multiple ? false : value,
    filterSelectedOptions,
    changeHighlightedIndex,
    setHighlightedIndex,
    popupOpen,
    inputValue,
    multiple
  ])

  const handleListboxRef = useEventCallback((node) => {
    setRef(listboxRef, node)

    if (!node) {
      return
    }

    syncHighlightedIndex()
  })

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      if (!inputRef.current || inputRef.current.nodeName !== 'INPUT') {
        console.error(
          [
            `Material-UI: Unable to find the input element. It was resolved to ${inputRef.current} while an HTMLInputElement was expected.`,
            `Instead, ${componentName} expects an input element.`,
            '',
            componentName === 'useAutocomplete'
              ? 'Make sure you have binded getInputProps correctly and that the normal ref/effect resolutions order is guaranteed.'
              : 'Make sure you have customized the input component correctly.'
          ].join('\n')
        )
      }
    }, [componentName])
  }

  React.useEffect(() => {
    syncHighlightedIndex()
  }, [syncHighlightedIndex])

  const handleOpen = (event) => {
    if (open) {
      return
    }

    setOpenState(true)
    setInputPristine(true)

    if (onOpen) {
      onOpen(event)
    }
  }

  const handleClose = (event, reason) => {
    if (!open) {
      return
    }

    setOpenState(false)

    if (onClose) {
      onClose(event, reason)
    }
  }

  const handleValue = (event, newValue, reason, details) => {
    if (value === newValue) {
      return
    }

    if (onChange) {
      onChange(event, newValue, reason, details)
    }

    setValueState(newValue)
  }

  const isTouch = React.useRef(false)

  const selectNewValue = (event, option, reasonProp = 'selectOption', origin = 'options') => {
    let reason = reasonProp
    let newValue = option

    if (multiple) {
      newValue = Array.isArray(value) ? value.slice() : []

      if (process.env.NODE_ENV !== 'production') {
        const matches = newValue.filter((val) => isOptionEqualToValue(option, val))

        if (matches.length > 1) {
          console.error(
            [
              `Material-UI: The \`isOptionEqualToValue\` method of ${componentName} do not handle the arguments correctly.`,
              `The component expects a single value to match a given option but found ${matches.length} matches.`
            ].join('\n')
          )
        }
      }

      const itemIndex = findIndex(newValue, (valueItem) => isOptionEqualToValue(option, valueItem))

      if (itemIndex === -1) {
        newValue.push(option)
      } else if (origin !== 'freeSolo') {
        newValue.splice(itemIndex, 1)
        reason = 'removeOption'
      }
    }

    resetInputValue(event, newValue)

    handleValue(event, newValue, reason, { option })
    if (!disableCloseOnSelect && !event.ctrlKey && !event.metaKey) {
      handleClose(event, reason)
    }

    if (
      blurOnSelect === true ||
      (blurOnSelect === 'touch' && isTouch.current) ||
      (blurOnSelect === 'mouse' && !isTouch.current)
    ) {
      inputRef.current.blur()
    }
  }

  function validTagIndex (index, direction) {
    if (index === -1) {
      return -1
    }

    let nextFocus = index

    while (true) {
      // Out of range
      if (
        (direction === 'next' && nextFocus === value.length) ||
        (direction === 'previous' && nextFocus === -1)
      ) {
        return -1
      }

      const option = anchorEl.querySelector(`[data-tag-index="${nextFocus}"]`)

      // Same logic as MenuList.js
      if (
        !option ||
        !option.hasAttribute('tabindex') ||
        option.disabled ||
        option.getAttribute('aria-disabled') === 'true'
      ) {
        nextFocus += direction === 'next' ? 1 : -1
      } else {
        return nextFocus
      }
    }
  }

  const handleFocusTag = (event, direction) => {
    if (!multiple) {
      return
    }

    handleClose(event, 'toggleInput')

    let nextTag = focusedTag

    if (focusedTag === -1) {
      if (inputValue === '' && direction === 'previous') {
        nextTag = value.length - 1
      }
    } else {
      nextTag += direction === 'next' ? 1 : -1

      if (nextTag < 0) {
        nextTag = 0
      }

      if (nextTag === value.length) {
        nextTag = -1
      }
    }

    nextTag = validTagIndex(nextTag, direction)

    setFocusedTag(nextTag)
    focusTag(nextTag)
  }

  const handleClear = (event) => {
    ignoreFocus.current = true
    setInputValueState('')

    if (onInputChange) {
      onInputChange(event, '', 'clear')
    }

    handleValue(event, multiple ? [] : null, 'clear')
  }

  const handleKeyDown = (other) => (event) => {
    if (other.onKeyDown) {
      other.onKeyDown(event)
    }

    if (event.defaultMuiPrevented) {
      return
    }

    if (focusedTag !== -1 && ['ArrowLeft', 'ArrowRight'].indexOf(event.key) === -1) {
      setFocusedTag(-1)
      focusTag(-1)
    }

    // Wait until IME is settled.
    if (event.which !== 229) {
      switch (event.key) {
        case 'Home':
          if (popupOpen && handleHomeEndKeys) {
            // Prevent scroll of the page
            event.preventDefault()
            changeHighlightedIndex({ diff: 'start', direction: 'next', reason: 'keyboard', event })
          }
          break
        case 'End':
          if (popupOpen && handleHomeEndKeys) {
            // Prevent scroll of the page
            event.preventDefault()
            changeHighlightedIndex({
              diff: 'end',
              direction: 'previous',
              reason: 'keyboard',
              event
            })
          }
          break
        case 'PageUp':
          // Prevent scroll of the page
          event.preventDefault()
          changeHighlightedIndex({
            diff: -pageSize,
            direction: 'previous',
            reason: 'keyboard',
            event
          })
          handleOpen(event)
          break
        case 'PageDown':
          // Prevent scroll of the page
          event.preventDefault()
          changeHighlightedIndex({ diff: pageSize, direction: 'next', reason: 'keyboard', event })
          handleOpen(event)
          break
        case 'ArrowDown':
          // Prevent cursor move
          event.preventDefault()
          changeHighlightedIndex({ diff: 1, direction: 'next', reason: 'keyboard', event })
          handleOpen(event)
          break
        case 'ArrowUp':
          // Prevent cursor move
          event.preventDefault()
          changeHighlightedIndex({ diff: -1, direction: 'previous', reason: 'keyboard', event })
          handleOpen(event)
          break
        case 'ArrowLeft':
          handleFocusTag(event, 'previous')
          break
        case 'ArrowRight':
          handleFocusTag(event, 'next')
          break
        case 'Enter':
          if (highlightedIndexRef.current !== -1 && popupOpen) {
            const option = filteredOptions[highlightedIndexRef.current]
            const disabled = getOptionDisabled ? getOptionDisabled(option) : false

            // Avoid early form validation, let the end-users continue filling the form.
            event.preventDefault()

            if (disabled) {
              return
            }

            selectNewValue(event, option, 'selectOption')

            // Move the selection to the end.
            if (autoComplete) {
              inputRef.current.setSelectionRange(
                inputRef.current.value.length,
                inputRef.current.value.length
              )
            }
          } else if (freeSolo && inputValue !== '' && inputValueIsSelectedValue === false) {
            if (multiple) {
              // Allow people to add new values before they submit the form.
              event.preventDefault()
            }
            selectNewValue(event, inputValue, 'createOption', 'freeSolo')
          }
          break
        case 'Escape':
          if (popupOpen) {
            // Avoid Opera to exit fullscreen mode.
            event.preventDefault()
            // Avoid the Modal to handle the event.
            event.stopPropagation()
            handleClose(event, 'escape')
          } else if (clearOnEscape && (inputValue !== '' || (multiple && value.length > 0))) {
            // Avoid Opera to exit fullscreen mode.
            event.preventDefault()
            // Avoid the Modal to handle the event.
            event.stopPropagation()
            handleClear(event)
          }
          break
        case 'Backspace':
          if (multiple && inputValue === '' && value.length > 0) {
            const index = focusedTag === -1 ? value.length - 1 : focusedTag
            const newValue = value.slice()
            newValue.splice(index, 1)
            handleValue(event, newValue, 'removeOption', {
              option: value[index]
            })
          }
          break
        default:
      }
    }
  }

  const handleFocus = (event) => {
    setFocused(true)

    if (openOnFocus && !ignoreFocus.current) {
      handleOpen(event)
    }
  }

  const handleBlur = (event) => {
    // Ignore the event when using the scrollbar with IE11
    if (
      listboxRef.current !== null &&
      listboxRef.current.parentElement.contains(document.activeElement)
    ) {
      inputRef.current.focus()
      return
    }

    setFocused(false)
    firstFocus.current = true
    ignoreFocus.current = false

    if (autoSelect && highlightedIndexRef.current !== -1 && popupOpen) {
      selectNewValue(event, filteredOptions[highlightedIndexRef.current], 'blur')
    } else if (autoSelect && freeSolo && inputValue !== '') {
      selectNewValue(event, inputValue, 'blur', 'freeSolo')
    } else if (clearOnBlur) {
      resetInputValue(event, value)
    }

    handleClose(event, 'blur')
  }

  const handleInputChange = (event) => {
    const newValue = event.target.value

    if (inputValue !== newValue) {
      setInputValueState(newValue)
      setInputPristine(false)

      if (onInputChange) {
        onInputChange(event, newValue, 'input')
      }
    }

    if (newValue === '') {
      if (!disableClearable && !multiple) {
        handleValue(event, null, 'clear')
      }
    } else {
      handleOpen(event)
    }
  }

  const handleOptionMouseOver = (event) => {
    setHighlightedIndex({
      event,
      index: Number(event.currentTarget.getAttribute('data-option-index')),
      reason: 'mouse'
    })
  }

  const handleOptionTouchStart = () => {
    isTouch.current = true
  }

  const handleOptionClick = (event) => {
    const index = Number(event.currentTarget.getAttribute('data-option-index'))
    selectNewValue(event, filteredOptions[index], 'selectOption')

    isTouch.current = false
  }

  const handleTagDelete = (index) => (event) => {
    const newValue = value.slice()
    newValue.splice(index, 1)
    handleValue(event, newValue, 'removeOption', {
      option: value[index]
    })
  }

  const handlePopupIndicator = (event) => {
    if (open) {
      handleClose(event, 'toggleInput')
    } else {
      handleOpen(event)
    }
  }

  // Prevent input blur when interacting with the combobox
  const handleMouseDown = (event) => {
    if (event.target.getAttribute('id') !== id) {
      event.preventDefault()
    }
  }

  // Focus the input when interacting with the combobox
  const handleClick = () => {
    inputRef.current.focus()

    if (
      selectOnFocus &&
      firstFocus.current &&
      inputRef.current.selectionEnd - inputRef.current.selectionStart === 0
    ) {
      inputRef.current.select()
    }

    firstFocus.current = false
  }

  const handleInputMouseDown = (event) => {
    if (inputValue === '' || !open) {
      handlePopupIndicator(event)
    }
  }

  let dirty = freeSolo && inputValue.length > 0
  dirty = dirty || (multiple ? value.length > 0 : value !== null)

  let groupedOptions = filteredOptions
  if (groupBy) {
    // used to keep track of key and indexes in the result array
    const indexBy = new Map()
    let warn = false

    groupedOptions = filteredOptions.reduce((acc, option, index) => {
      const group = groupBy(option)

      if (acc.length > 0 && acc[acc.length - 1].group === group) {
        acc[acc.length - 1].options.push(option)
      } else {
        if (process.env.NODE_ENV !== 'production') {
          if (indexBy.get(group) && !warn) {
            console.warn(
              `Material-UI: The options provided combined with the \`groupBy\` method of ${componentName} returns duplicated headers.`,
              'You can solve the issue by sorting the options with the output of `groupBy`.'
            )
            warn = true
          }
          indexBy.set(group, true)
        }

        acc.push({
          key: index,
          index,
          group,
          options: [option]
        })
      }

      return acc
    }, [])
  }

  if (disabledProp && focused) {
    handleBlur()
  }

  return {
    getRootProps: (other = {}) => ({
      'aria-owns': listboxAvailable ? `${id}-listbox` : null,
      role: 'combobox',
      'aria-expanded': listboxAvailable,
      ...other,
      onKeyDown: handleKeyDown(other),
      onMouseDown: handleMouseDown,
      onClick: handleClick
    }),
    getInputLabelProps: () => ({
      id: `${id}-label`,
      htmlFor: id
    }),
    getInputProps: () => ({
      id,
      value: inputValue,
      onBlur: handleBlur,
      onFocus: handleFocus,
      onChange: handleInputChange,
      onMouseDown: handleInputMouseDown,
      // if open then this is handled imperativeley so don't let react override
      // only have an opinion about this when closed
      'aria-activedescendant': popupOpen ? '' : null,
      'aria-autocomplete': autoComplete ? 'both' : 'list',
      'aria-controls': listboxAvailable ? `${id}-listbox` : null,
      // Disable browser's suggestion that might overlap with the popup.
      // Handle autocomplete but not autofill.
      autoComplete: 'off',
      ref: inputRef,
      autoCapitalize: 'none',
      spellCheck: 'false'
    }),
    getClearProps: () => ({
      tabIndex: -1,
      onClick: handleClear
    }),
    getPopupIndicatorProps: () => ({
      tabIndex: -1,
      onClick: handlePopupIndicator
    }),
    getTagProps: ({ index }) => ({
      key: index,
      'data-tag-index': index,
      tabIndex: -1,
      onDelete: handleTagDelete(index)
    }),
    getListboxProps: () => ({
      role: 'listbox',
      id: `${id}-listbox`,
      'aria-labelledby': `${id}-label`,
      ref: handleListboxRef,
      onMouseDown: (event) => {
        // Prevent blur
        event.preventDefault()
      }
    }),
    getOptionProps: ({ index, option }) => {
      const selected = (multiple ? value : [value]).some(
        (value2) => value2 != null && isOptionEqualToValue(option, value2)
      )
      const disabled = getOptionDisabled ? getOptionDisabled(option) : false

      return {
        key: getOptionLabel(option),
        tabIndex: -1,
        role: 'option',
        id: `${id}-option-${index}`,
        onMouseOver: handleOptionMouseOver,
        onClick: handleOptionClick,
        onTouchStart: handleOptionTouchStart,
        'data-option-index': index,
        'aria-disabled': disabled,
        'aria-selected': selected
      }
    },
    id,
    inputValue,
    value,
    dirty,
    popupOpen,
    focused: focused || focusedTag !== -1,
    anchorEl,
    setAnchorEl,
    focusedTag,
    groupedOptions
  }
}

const useUtilityClasses = (ownerState) => {
  const {
    classes,
    disablePortal,
    focused,
    fullWidth,
    hasClearIcon,
    hasPopupIcon,
    inputFocused,
    popupOpen,
    size
  } = ownerState

  const slots = {
    root: [
      'root',
      focused && 'focused',
      fullWidth && 'fullWidth',
      hasClearIcon && 'hasClearIcon',
      hasPopupIcon && 'hasPopupIcon'
    ],
    inputRoot: ['inputRoot'],
    input: ['input', inputFocused && 'inputFocused'],
    tag: ['tag', `tagSize${capitalize(size)}`],
    endAdornment: ['endAdornment'],
    clearIndicator: ['clearIndicator'],
    popupIndicator: ['popupIndicator', popupOpen && 'popupIndicatorOpen'],
    popper: ['popper', disablePortal && 'popperDisablePortal'],
    paper: ['paper'],
    listbox: ['listbox'],
    loading: ['loading'],
    noOptions: ['noOptions'],
    option: ['option'],
    groupLabel: ['groupLabel'],
    groupUl: ['groupUl']
  }

  return composeClasses(slots, getAutocompleteUtilityClass, classes)
}

const AutocompleteRoot = styled('div', {
  name: 'MuiAutocomplete',
  slot: 'Root',
  overridesResolver: (props, styles) => {
    const { ownerState } = props
    const { fullWidth, hasClearIcon, hasPopupIcon, inputFocused, size } = ownerState

    return [
      { [`& .${autocompleteClasses.tag}`]: styles.tag },
      { [`& .${autocompleteClasses.tag}`]: styles[`tagSize${capitalize(size)}`] },
      { [`& .${autocompleteClasses.inputRoot}`]: styles.inputRoot },
      { [`& .${autocompleteClasses.input}`]: styles.input },
      { [`& .${autocompleteClasses.input}`]: inputFocused && styles.inputFocused },
      styles.root,
      fullWidth && styles.fullWidth,
      hasPopupIcon && styles.hasPopupIcon,
      hasClearIcon && styles.hasClearIcon
    ]
  }
})(({ ownerState }) => ({
  [`&.${autocompleteClasses.focused} .${autocompleteClasses.clearIndicator}`]: {
    visibility: 'visible'
  },
  /* Avoid double tap issue on iOS */
  '@media (pointer: fine)': {
    [`&:hover .${autocompleteClasses.clearIndicator}`]: {
      visibility: 'visible'
    }
  },
  ...(ownerState.fullWidth && {
    width: '100%'
  }),
  [`& .${autocompleteClasses.tag}`]: {
    margin: 3,
    maxWidth: 'calc(100% - 6px)',
    ...(ownerState.size === 'small' && {
      margin: 2,
      maxWidth: 'calc(100% - 4px)'
    })
  },
  [`& .${autocompleteClasses.inputRoot}`]: {
    flexWrap: 'wrap',
    [`.${autocompleteClasses.hasPopupIcon}&, .${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 26 + 4
    },
    [`.${autocompleteClasses.hasPopupIcon}.${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 52 + 4
    },
    [`& .${autocompleteClasses.input}`]: {
      width: 0,
      minWidth: 30
    }
  },
  '& .MuiInput-root': {
    paddingBottom: 1,
    '& .MuiInput-input': {
      padding: '4px 4px 4px 0px'
    }
  },
  '& .MuiInput-root.MuiInputBase-sizeSmall': {
    '& .MuiInput-input': {
      padding: '2px 4px 3px 0'
    }
  },
  '& .MuiOutlinedInput-root': {
    padding: 9,
    [`.${autocompleteClasses.hasPopupIcon}&, .${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 26 + 4 + 9
    },
    [`.${autocompleteClasses.hasPopupIcon}.${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 52 + 4 + 9
    },
    [`& .${autocompleteClasses.input}`]: {
      padding: '7.5px 4px 7.5px 6px'
    },
    [`& .${autocompleteClasses.endAdornment}`]: {
      right: 9
    }
  },
  '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall': {
    padding: 6,
    [`& .${autocompleteClasses.input}`]: {
      padding: '2.5px 4px 2.5px 6px'
    }
  },
  '& .MuiFilledInput-root': {
    paddingTop: 19,
    paddingLeft: 8,
    [`.${autocompleteClasses.hasPopupIcon}&, .${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 26 + 4 + 9
    },
    [`.${autocompleteClasses.hasPopupIcon}.${autocompleteClasses.hasClearIcon}&`]: {
      paddingRight: 52 + 4 + 9
    },
    '& .MuiFilledInput-input': {
      padding: '7px 4px'
    },
    [`& .${autocompleteClasses.endAdornment}`]: {
      right: 9
    }
  },
  '& .MuiFilledInput-root.MuiInputBase-sizeSmall': {
    paddingBottom: 1,
    '& .MuiFilledInput-input': {
      padding: '2.5px 4px'
    }
  },
  [`& .${autocompleteClasses.input}`]: {
    flexGrow: 1,
    textOverflow: 'ellipsis',
    opacity: 0,
    ...(ownerState.inputFocused && {
      opacity: 1
    })
  }
}))

const AutocompleteEndAdornment = styled('div', {
  name: 'MuiAutocomplete',
  slot: 'EndAdornment',
  overridesResolver: (props, styles) => styles.endAdornment
})({
  // We use a position absolute to support wrapping tags.
  position: 'absolute',
  right: 0,
  top: 'calc(50% - 14px)' // Center vertically
})

const AutocompleteClearIndicator = styled(IconButton, {
  name: 'MuiAutocomplete',
  slot: 'ClearIndicator',
  overridesResolver: (props, styles) => styles.clearIndicator
})({
  marginRight: -2,
  padding: 4,
  visibility: 'hidden'
})

const AutocompletePopupIndicator = styled(IconButton, {
  name: 'MuiAutocomplete',
  slot: 'PopupIndicator',
  overridesResolver: ({ ownerState }, styles) => ({
    ...styles.popupIndicator,
    ...(ownerState.popupOpen && styles.popupIndicatorOpen)
  })
})(({ ownerState }) => ({
  padding: 2,
  marginRight: -2,
  ...(ownerState.popupOpen && {
    transform: 'rotate(180deg)'
  })
}))

const AutocompletePopper = styled(Popper, {
  name: 'MuiAutocomplete',
  slot: 'Popper',
  overridesResolver: (props, styles) => {
    const { ownerState } = props

    return [
      { [`& .${autocompleteClasses.option}`]: styles.option },
      styles.popper,
      ownerState.disablePortal && styles.popperDisablePortal
    ]
  }
})(({ theme, ownerState }) => ({
  zIndex: theme.zIndex.modal,
  ...(ownerState.disablePortal && {
    position: 'absolute'
  })
}))

const AutocompletePaper = styled(Paper, {
  name: 'MuiAutocomplete',
  slot: 'Paper',
  overridesResolver: (props, styles) => styles.paper
})(({ theme }) => ({
  ...theme.typography.body1,
  overflow: 'auto'
}))

const AutocompleteLoading = styled('div', {
  name: 'MuiAutocomplete',
  slot: 'Loading',
  overridesResolver: (props, styles) => styles.loading
})(({ theme }) => ({
  color: theme.palette.text.secondary,
  padding: '14px 16px'
}))

const AutocompleteNoOptions = styled('div', {
  name: 'MuiAutocomplete',
  slot: 'NoOptions',
  overridesResolver: (props, styles) => styles.noOptions
})(({ theme }) => ({
  color: theme.palette.text.secondary,
  padding: '14px 16px'
}))

const AutocompleteListbox = styled('div', {
  name: 'MuiAutocomplete',
  slot: 'Listbox',
  overridesResolver: (props, styles) => styles.listbox
})(({ theme }) => ({
  listStyle: 'none',
  margin: 0,
  padding: '8px 0',
  maxHeight: '40vh',
  overflow: 'auto',
  [`& .${autocompleteClasses.option}`]: {
    minHeight: 48,
    display: 'flex',
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
    cursor: 'pointer',
    paddingTop: 6,
    boxSizing: 'border-box',
    outline: '0',
    WebkitTapHighlightColor: 'transparent',
    paddingBottom: 6,
    paddingLeft: 16,
    paddingRight: 16,
    [theme.breakpoints.up('sm')]: {
      minHeight: 'auto'
    },
    [`&.${autocompleteClasses.focused}`]: {
      backgroundColor: theme.palette.action.hover,
      // Reset on touch devices, it doesn't add specificity
      '@media (hover: none)': {
        backgroundColor: 'transparent'
      }
    },
    '&[aria-disabled="true"]': {
      opacity: theme.palette.action.disabledOpacity,
      pointerEvents: 'none'
    },
    [`&.${autocompleteClasses.focusVisible}`]: {
      backgroundColor: theme.palette.action.focus
    },
    '&[aria-selected="true"]': {
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
      [`&.${autocompleteClasses.focused}`]: {
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity
        ),
        // Reset on touch devices, it doesn't add specificity
        '@media (hover: none)': {
          backgroundColor: theme.palette.action.selected
        }
      },
      [`&.${autocompleteClasses.focusVisible}`]: {
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity
        )
      }
    }
  }
}))

const AutocompleteGroupLabel = styled(ListSubheader, {
  name: 'MuiAutocomplete',
  slot: 'GroupLabel',
  overridesResolver: (props, styles) => styles.groupLabel
})(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  top: -8
}))

const AutocompleteGroupUl = styled('ul', {
  name: 'MuiAutocomplete',
  slot: 'GroupUl',
  overridesResolver: (props, styles) => styles.groupUl
})({
  padding: 0,
  [`& .${autocompleteClasses.option}`]: {
    paddingLeft: 24
  }
})

const Autocomplete = React.forwardRef(function Autocomplete (inProps, ref) {
  const props = useThemeProps({ props: inProps, name: 'MuiAutocomplete' })
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    autoComplete = false,
    autoHighlight = false,
    autoSelect = false,
    blurOnSelect = false,
    ChipProps,
    className,
    clearIcon = <ClearIcon fontSize="small" />,
    clearOnBlur = !props.freeSolo,
    clearOnEscape = false,
    clearText = 'Clear',
    closeText = 'Close',
    componentsProps = {},
    defaultValue = props.multiple ? [] : null,
    disableClearable = false,
    disableCloseOnSelect = false,
    disabled = false,
    disabledItemsFocusable = false,
    disableListWrap = false,
    disablePortal = false,
    filterOptions,
    filterSelectedOptions = false,
    forcePopupIcon = 'auto',
    freeSolo = false,
    fullWidth = false,
    getLimitTagsText = (more) => `+${more}`,
    getOptionDisabled,
    getOptionLabel = (option) => option.label ?? option,
    isOptionEqualToValue,
    groupBy,
    handleHomeEndKeys = !props.freeSolo,
    id: idProp,
    includeInputInList = false,
    inputValue: inputValueProp,
    limitTags = -1,
    ListboxComponent = 'ul',
    ListboxProps,
    loading = false,
    loadingText = 'Loading…',
    multiple = false,
    noOptionsText = 'No options',
    onChange,
    onClose,
    onHighlightChange,
    onInputChange,
    onOpen,
    open,
    openOnFocus = false,
    openText = 'Open',
    options,
    PaperComponent = Paper,
    PopperComponent = Popper,
    popupIcon = <ArrowDropDownIcon />,
    renderGroup: renderGroupProp,
    renderInput,
    renderOption: renderOptionProp,
    renderTags,
    selectOnFocus = !props.freeSolo,
    size = 'medium',
    value: valueProp,
    ...other
  } = props
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const {
    getRootProps,
    getInputProps,
    getInputLabelProps,
    getPopupIndicatorProps,
    getClearProps,
    getTagProps,
    getListboxProps,
    getOptionProps,
    value,
    dirty,
    id,
    popupOpen,
    focused,
    focusedTag,
    anchorEl,
    setAnchorEl,
    inputValue,
    groupedOptions
  } = useAutocomplete({ ...props, componentName: 'Autocomplete' })

  const hasClearIcon = !disableClearable && !disabled && dirty
  const hasPopupIcon = (!freeSolo || forcePopupIcon === true) && forcePopupIcon !== false

  const ownerState = {
    ...props,
    disablePortal,
    focused,
    fullWidth,
    hasClearIcon,
    hasPopupIcon,
    inputFocused: focusedTag === -1,
    popupOpen,
    size
  }

  const classes = useUtilityClasses(ownerState)

  let startAdornment

  if (multiple && value.length > 0) {
    const getCustomizedTagProps = (params) => ({
      className: clsx(classes.tag),
      disabled,
      ...getTagProps(params)
    })

    if (renderTags) {
      startAdornment = renderTags(value, getCustomizedTagProps)
    } else {
      startAdornment = value.map((option, index) => (
        <Chip
          label={getOptionLabel(option)}
          size={size}
          {...getCustomizedTagProps({ index })}
          {...ChipProps}
        />
      ))
    }
  }

  if (limitTags > -1 && Array.isArray(startAdornment)) {
    const more = startAdornment.length - limitTags
    if (!focused && more > 0) {
      startAdornment = startAdornment.splice(0, limitTags)
      startAdornment.push(
        <span className={classes.tag} key={startAdornment.length}>
          {getLimitTagsText(more)}
        </span>
      )
    }
  }

  const defaultRenderGroup = (params) => (
    <li key={params.key}>
      <AutocompleteGroupLabel
        className={classes.groupLabel}
        ownerState={ownerState}
        component="div"
      >
        {params.group}
      </AutocompleteGroupLabel>
      <AutocompleteGroupUl className={classes.groupUl} ownerState={ownerState}>
        {params.children}
      </AutocompleteGroupUl>
    </li>
  )

  const renderGroup = renderGroupProp || defaultRenderGroup
  const defaultRenderOption = (props2, option) => <li {...props2}>{getOptionLabel(option)}</li>
  const renderOption = renderOptionProp || defaultRenderOption

  const renderListOption = (option, index) => {
    const optionProps = getOptionProps({ option, index })

    return renderOption({ ...optionProps, className: classes.option }, option, {
      selected: optionProps['aria-selected'],
      inputValue
    })
  }

  return (
    <React.Fragment>
      <AutocompleteRoot
        ref={ref}
        className={clsx(classes.root, className)}
        ownerState={ownerState}
        {...getRootProps(other)}
      >
        {renderInput({
          id,
          disabled,
          fullWidth: true,
          size: size === 'small' ? 'small' : undefined,
          InputLabelProps: getInputLabelProps(),
          InputProps: {
            ref: setAnchorEl,
            className: classes.inputRoot,
            startAdornment,
            endAdornment: (
              <AutocompleteEndAdornment className={classes.endAdornment} ownerState={ownerState}>
                {hasClearIcon
                  ? (
                  <AutocompleteClearIndicator
                    {...getClearProps()}
                    aria-label={clearText}
                    title={clearText}
                    ownerState={ownerState}
                    {...componentsProps.clearIndicator}
                    className={clsx(
                      classes.clearIndicator,
                      componentsProps.clearIndicator?.className
                    )}
                  >
                    {clearIcon}
                  </AutocompleteClearIndicator>
                    )
                  : null}

                {hasPopupIcon
                  ? (
                  <AutocompletePopupIndicator
                    {...getPopupIndicatorProps()}
                    disabled={disabled}
                    aria-label={popupOpen ? closeText : openText}
                    title={popupOpen ? closeText : openText}
                    className={clsx(classes.popupIndicator)}
                    ownerState={ownerState}
                  >
                    {popupIcon}
                  </AutocompletePopupIndicator>
                    )
                  : null}
              </AutocompleteEndAdornment>
            )
          },
          inputProps: {
            className: clsx(classes.input),
            disabled,
            ...getInputProps()
          }
        })}
      </AutocompleteRoot>
      {popupOpen && anchorEl ? (
        <AutocompletePopper
          as={PopperComponent}
          className={clsx(classes.popper)}
          disablePortal={disablePortal}
          style={{
            width: anchorEl ? anchorEl.clientWidth : null
          }}
          ownerState={ownerState}
          role="presentation"
          anchorEl={anchorEl}
          open
        >
          <AutocompletePaper as={PaperComponent} className={classes.paper} ownerState={ownerState}>
            {loading && groupedOptions.length === 0
              ? (
              <AutocompleteLoading className={classes.loading} ownerState={ownerState}>
                {loadingText}
              </AutocompleteLoading>
                )
              : null}
            {groupedOptions.length === 0 && !freeSolo && !loading ? (
              <AutocompleteNoOptions
                className={classes.noOptions}
                ownerState={ownerState}
                role="presentation"
                onMouseDown={(event) => {
                  // Prevent input blur when interacting with the "no options" content
                  event.preventDefault()
                }}
              >
                {noOptionsText}
              </AutocompleteNoOptions>
            ) : null}
            {groupedOptions.length > 0
              ? (
              <AutocompleteListbox
                as={ListboxComponent}
                className={classes.listbox}
                ownerState={ownerState}
                {...getListboxProps()}
                {...ListboxProps}
              >
                {groupedOptions.map((option, index) => {
                  if (groupBy) {
                    return renderGroup({
                      key: option.key,
                      group: option.group,
                      children: option.options.map((option2, index2) =>
                        renderListOption(option2, option.index + index2)
                      )
                    })
                  }
                  return renderListOption(option, index)
                })}
              </AutocompleteListbox>
                )
              : null}
          </AutocompletePaper>
        </AutocompletePopper>
      ) : null}
    </React.Fragment>
  )
})

Autocomplete.propTypes /* remove-proptypes */ = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // |     To update them edit the d.ts file and run "yarn proptypes"     |
  // ----------------------------------------------------------------------
  /**
   * If `true`, the portion of the selected suggestion that has not been typed by the user,
   * known as the completion string, appears inline after the input cursor in the textbox.
   * The inline completion string is visually highlighted and has a selected state.
   * @default false
   */
  autoComplete: PropTypes.bool,
  /**
   * If `true`, the first option is automatically highlighted.
   * @default false
   */
  autoHighlight: PropTypes.bool,
  /**
   * If `true`, the selected option becomes the value of the input
   * when the Autocomplete loses focus unless the user chooses
   * a different option or changes the character string in the input.
   * @default false
   */
  autoSelect: PropTypes.bool,
  /**
   * Control if the input should be blurred when an option is selected:
   *
   * - `false` the input is not blurred.
   * - `true` the input is always blurred.
   * - `touch` the input is blurred after a touch event.
   * - `mouse` the input is blurred after a mouse event.
   * @default false
   */
  blurOnSelect: PropTypes.oneOfType([PropTypes.oneOf(['mouse', 'touch']), PropTypes.bool]),
  /**
   * Props applied to the [`Chip`](/api/chip/) element.
   */
  ChipProps: PropTypes.object,
  /**
   * Override or extend the styles applied to the component.
   */
  classes: PropTypes.object,
  /**
   * @ignore
   */
  className: PropTypes.string,
  /**
   * The icon to display in place of the default clear icon.
   * @default <ClearIcon fontSize="small" />
   */
  clearIcon: PropTypes.node,
  /**
   * If `true`, the input's text is cleared on blur if no value is selected.
   *
   * Set to `true` if you want to help the user enter a new value.
   * Set to `false` if you want to help the user resume his search.
   * @default !props.freeSolo
   */
  clearOnBlur: PropTypes.bool,
  /**
   * If `true`, clear all values when the user presses escape and the popup is closed.
   * @default false
   */
  clearOnEscape: PropTypes.bool,
  /**
   * Override the default text for the *clear* icon button.
   *
   * For localization purposes, you can use the provided [translations](/guides/localization/).
   * @default 'Clear'
   */
  clearText: PropTypes.string,
  /**
   * Override the default text for the *close popup* icon button.
   *
   * For localization purposes, you can use the provided [translations](/guides/localization/).
   * @default 'Close'
   */
  closeText: PropTypes.string,
  /**
   * The props used for each slot inside.
   * @default {}
   */
  componentsProps: PropTypes.object,
  /**
   * The default value. Use when the component is not controlled.
   * @default props.multiple ? [] : null
   */
  defaultValue: chainPropTypes(PropTypes.any, (props) => {
    if (props.multiple && props.defaultValue !== undefined && !Array.isArray(props.defaultValue)) {
      return new Error(
        [
          'Material-UI: The Autocomplete expects the `defaultValue` prop to be an array when `multiple={true}` or undefined.',
          `However, ${props.defaultValue} was provided.`
        ].join('\n')
      )
    }
    return null
  }),
  /**
   * If `true`, the input can't be cleared.
   * @default false
   */
  disableClearable: PropTypes.bool,
  /**
   * If `true`, the popup won't close when a value is selected.
   * @default false
   */
  disableCloseOnSelect: PropTypes.bool,
  /**
   * If `true`, the component is disabled.
   * @default false
   */
  disabled: PropTypes.bool,
  /**
   * If `true`, will allow focus on disabled items.
   * @default false
   */
  disabledItemsFocusable: PropTypes.bool,
  /**
   * If `true`, the list box in the popup will not wrap focus.
   * @default false
   */
  disableListWrap: PropTypes.bool,
  /**
   * If `true`, the `Popper` content will be under the DOM hierarchy of the parent component.
   * @default false
   */
  disablePortal: PropTypes.bool,
  /**
   * A filter function that determines the options that are eligible.
   *
   * @param {T[]} options The options to render.
   * @param {object} state The state of the component.
   * @returns {T[]}
   */
  filterOptions: PropTypes.func,
  /**
   * If `true`, hide the selected options from the list box.
   * @default false
   */
  filterSelectedOptions: PropTypes.bool,
  /**
   * Force the visibility display of the popup icon.
   * @default 'auto'
   */
  forcePopupIcon: PropTypes.oneOfType([PropTypes.oneOf(['auto']), PropTypes.bool]),
  /**
   * If `true`, the Autocomplete is free solo, meaning that the user input is not bound to provided options.
   * @default false
   */
  freeSolo: PropTypes.bool,
  /**
   * If `true`, the input will take up the full width of its container.
   * @default false
   */
  fullWidth: PropTypes.bool,
  /**
   * The label to display when the tags are truncated (`limitTags`).
   *
   * @param {number} more The number of truncated tags.
   * @returns {ReactNode}
   * @default (more) => `+${more}`
   */
  getLimitTagsText: PropTypes.func,
  /**
   * Used to determine the disabled state for a given option.
   *
   * @param {T} option The option to test.
   * @returns {boolean}
   */
  getOptionDisabled: PropTypes.func,
  /**
   * Used to determine the string value for a given option.
   * It's used to fill the input (and the list box options if `renderOption` is not provided).
   *
   * @param {T} option
   * @returns {string}
   * @default (option) => option.label ?? option
   */
  getOptionLabel: PropTypes.func,
  /**
   * If provided, the options will be grouped under the returned string.
   * The groupBy value is also used as the text for group headings when `renderGroup` is not provided.
   *
   * @param {T} options The options to group.
   * @returns {string}
   */
  groupBy: PropTypes.func,
  /**
   * If `true`, the component handles the "Home" and "End" keys when the popup is open.
   * It should move focus to the first option and last option, respectively.
   * @default !props.freeSolo
   */
  handleHomeEndKeys: PropTypes.bool,
  /**
   * This prop is used to help implement the accessibility logic.
   * If you don't provide an id it will fall back to a randomly generated one.
   */
  id: PropTypes.string,
  /**
   * If `true`, the highlight can move to the input.
   * @default false
   */
  includeInputInList: PropTypes.bool,
  /**
   * The input value.
   */
  inputValue: PropTypes.string,
  /**
   * Used to determine if the option represents the given value.
   * Uses strict equality by default.
   * ⚠️ Both arguments need to be handled, an option can only match with one value.
   *
   * @param {T} option The option to test.
   * @param {T} value The value to test against.
   * @returns {boolean}
   */
  isOptionEqualToValue: PropTypes.func,
  /**
   * The maximum number of tags that will be visible when not focused.
   * Set `-1` to disable the limit.
   * @default -1
   */
  limitTags: integerPropType,
  /**
   * The component used to render the listbox.
   * @default 'ul'
   */
  ListboxComponent: PropTypes.elementType,
  /**
   * Props applied to the Listbox element.
   */
  ListboxProps: PropTypes.object,
  /**
   * If `true`, the component is in a loading state.
   * This shows the `loadingText` in place of suggestions (only if there are no suggestions to show, e.g. `options` are empty).
   * @default false
   */
  loading: PropTypes.bool,
  /**
   * Text to display when in a loading state.
   *
   * For localization purposes, you can use the provided [translations](/guides/localization/).
   * @default 'Loading…'
   */
  loadingText: PropTypes.node,
  /**
   * If `true`, `value` must be an array and the menu will support multiple selections.
   * @default false
   */
  multiple: PropTypes.bool,
  /**
   * Text to display when there are no options.
   *
   * For localization purposes, you can use the provided [translations](/guides/localization/).
   * @default 'No options'
   */
  noOptionsText: PropTypes.node,
  /**
   * Callback fired when the value changes.
   *
   * @param {React.SyntheticEvent} event The event source of the callback.
   * @param {T|T[]} value The new value of the component.
   * @param {string} reason One of "createOption", "selectOption", "removeOption", "blur" or "clear".
   * @param {string} [details]
   */
  onChange: PropTypes.func,
  /**
   * Callback fired when the popup requests to be closed.
   * Use in controlled mode (see open).
   *
   * @param {React.SyntheticEvent} event The event source of the callback.
   * @param {string} reason Can be: `"toggleInput"`, `"escape"`, `"selectOption"`, `"removeOption"`, `"blur"`.
   */
  onClose: PropTypes.func,
  /**
   * Callback fired when the highlight option changes.
   *
   * @param {React.SyntheticEvent} event The event source of the callback.
   * @param {T} option The highlighted option.
   * @param {string} reason Can be: `"keyboard"`, `"auto"`, `"mouse"`.
   */
  onHighlightChange: PropTypes.func,
  /**
   * Callback fired when the input value changes.
   *
   * @param {React.SyntheticEvent} event The event source of the callback.
   * @param {string} value The new value of the text input.
   * @param {string} reason Can be: `"input"` (user input), `"reset"` (programmatic change), `"clear"`.
   */
  onInputChange: PropTypes.func,
  /**
   * Callback fired when the popup requests to be opened.
   * Use in controlled mode (see open).
   *
   * @param {React.SyntheticEvent} event The event source of the callback.
   */
  onOpen: PropTypes.func,
  /**
   * If `true`, the component is shown.
   */
  open: PropTypes.bool,
  /**
   * If `true`, the popup will open on input focus.
   * @default false
   */
  openOnFocus: PropTypes.bool,
  /**
   * Override the default text for the *open popup* icon button.
   *
   * For localization purposes, you can use the provided [translations](/guides/localization/).
   * @default 'Open'
   */
  openText: PropTypes.string,
  /**
   * Array of options.
   */
  options: PropTypes.array.isRequired,
  /**
   * The component used to render the body of the popup.
   * @default Paper
   */
  PaperComponent: PropTypes.elementType,
  /**
   * The component used to position the popup.
   * @default Popper
   */
  PopperComponent: PropTypes.elementType,
  /**
   * The icon to display in place of the default popup icon.
   * @default <ArrowDropDownIcon />
   */
  popupIcon: PropTypes.node,
  /**
   * Render the group.
   *
   * @param {any} option The group to render.
   * @returns {ReactNode}
   */
  renderGroup: PropTypes.func,
  /**
   * Render the input.
   *
   * @param {object} params
   * @returns {ReactNode}
   */
  renderInput: PropTypes.func.isRequired,
  /**
   * Render the option, use `getOptionLabel` by default.
   *
   * @param {object} props The props to apply on the li element.
   * @param {T} option The option to render.
   * @param {object} state The state of the component.
   * @returns {ReactNode}
   */
  renderOption: PropTypes.func,
  /**
   * Render the selected value.
   *
   * @param {T[]} value The `value` provided to the component.
   * @param {function} getTagProps A tag props getter.
   * @returns {ReactNode}
   */
  renderTags: PropTypes.func,
  /**
   * If `true`, the input's text is selected on focus.
   * It helps the user clear the selected value.
   * @default !props.freeSolo
   */
  selectOnFocus: PropTypes.bool,
  /**
   * The size of the component.
   * @default 'medium'
   */
  size: PropTypes /* @typescript-to-proptypes-ignore */.oneOfType([
    PropTypes.oneOf(['small', 'medium']),
    PropTypes.string
  ]),
  /**
   * The system prop that allows defining system overrides as well as additional CSS styles.
   */
  sx: PropTypes.object,
  /**
   * The value of the autocomplete.
   *
   * The value must have reference equality with the option in order to be selected.
   * You can customize the equality behavior with the `isOptionEqualToValue` prop.
   */
  value: chainPropTypes(PropTypes.any, (props) => {
    if (props.multiple && props.value !== undefined && !Array.isArray(props.value)) {
      return new Error(
        [
          'Material-UI: The Autocomplete expects the `value` prop to be an array when `multiple={true}` or undefined.',
          `However, ${props.value} was provided.`
        ].join('\n')
      )
    }
    return null
  })
}

export default Autocomplete
