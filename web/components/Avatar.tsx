import * as React from 'react'
import clsx from 'clsx'
import { unstable_composeClasses as composeClasses } from '@material-ui/unstyled'
import styled from '@material-ui/core/styles/styled'
import useThemeProps from '@material-ui/core/styles/useThemeProps'
import Person from '@material-ui/icons/Person'
import { getAvatarUtilityClass, AvatarClasses } from '@material-ui/core/Avatar/avatarClasses'
import { SxProps } from '@material-ui/system'
import { Theme } from '@material-ui/core/styles'
import { OverridableStringUnion } from '@material-ui/types'
import { OverridableComponent, OverrideProps } from '@material-ui/core/OverridableComponent'

export interface AvatarPropsVariantOverrides {}

const useUtilityClasses = (styleProps: any) => {
  const { classes, variant, colorDefault } = styleProps

  const slots = {
    root: ['root', variant, colorDefault && 'colorDefault'],
    img: ['img'],
    fallback: ['fallback']
  }

  return composeClasses(slots, getAvatarUtilityClass, classes)
}

const AvatarRoot = styled('div', {
  name: 'MuiAvatar',
  slot: 'Root',
  overridesResolver: (props, styles) => {
    const { styleProps } = props

    return [
      styles.root,
      styles[styleProps.variant],
      styleProps.colorDefault && styles.colorDefault
    ]
  }
})(({ theme, styleProps }: any) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 40,
  height: 40,
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.pxToRem(20),
  lineHeight: 1,
  borderRadius: '50%',
  overflow: 'hidden',
  userSelect: 'none',
  ...(styleProps.variant === 'rounded' && {
    borderRadius: theme.shape.borderRadius
  }),
  ...(styleProps.variant === 'square' && {
    borderRadius: 0
  }),
  ...(styleProps.colorDefault && {
    color: theme.palette.background.default,
    backgroundColor:
      theme.palette.mode === 'light' ? theme.palette.grey[400] : theme.palette.grey[600]
  })
}))

const AvatarImg = styled('img', {
  name: 'MuiAvatar',
  slot: 'Img',
  overridesResolver: (props, styles) => styles.img
})({
  width: '100%',
  height: '100%',
  textAlign: 'center',
  objectFit: 'cover',
  color: 'transparent',
  textIndent: 10000
})

const AvatarFallback = styled(Person, {
  name: 'MuiAvatar',
  slot: 'Fallback',
  overridesResolver: (props, styles) => styles.fallback
})({
  width: '75%',
  height: '75%'
})

function useLoaded ({ crossOrigin, referrerPolicy, src, srcSet }: any) {
  const [loaded, setLoaded] = React.useState<false | string>(false)

  React.useEffect(() => {
    if (!src && !srcSet) {
      return undefined
    }

    setLoaded(false)

    let active = true
    const image = new Image()
    image.onload = () => {
      if (!active) {
        return
      }
      setLoaded('loaded')
    }
    image.onerror = () => {
      if (!active) {
        return
      }
      setLoaded('error')
    }
    image.crossOrigin = crossOrigin
    image.referrerPolicy = referrerPolicy
    image.src = src
    if (srcSet) {
      image.srcset = srcSet
    }

    return () => {
      active = false
    }
  }, [crossOrigin, referrerPolicy, src, srcSet])

  return loaded
}

interface AvatarTypeMap<P = {}, D extends React.ElementType = 'div'> {
  props: P & {
    /**
     * Used in combination with `src` or `srcSet` to
     * provide an alt attribute for the rendered `img` element.
     */
    alt?: string;
    /**
     * Used to render icon or text elements inside the Avatar if `src` is not set.
     * This can be an element, or just a string.
     */
    children?: React.ReactNode;
    /**
     * Override or extend the styles applied to the component.
     */
    classes?: Partial<AvatarClasses>;
    /**
     * <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#Attributes">Attributes</a> applied to the `img` element if the component is used to display an image.
     * It can be used to listen for the loading error event.
     */
    imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
    /**
     * The `sizes` attribute for the `img` element.
     */
    sizes?: string;
    /**
     * The `src` attribute for the `img` element.
     */
    src?: string;
    /**
     * The `srcSet` attribute for the `img` element.
     * Use this attribute for responsive image display.
     */
    srcSet?: string;
    /**
     * The system prop that allows defining system overrides as well as additional CSS styles.
     */
    sx?: SxProps<Theme>;
    /**
     * The shape of the avatar.
     * @default 'circular'
     */
    variant?: OverridableStringUnion<
      'circular' | 'rounded' | 'square',
      AvatarPropsVariantOverrides
      >;
  };
  defaultComponent: D;
}

const Avatar: OverridableComponent<AvatarTypeMap> = React.forwardRef(function Avatar (inProps: any, ref) {
  const props = useThemeProps({ props: inProps, name: 'MuiAvatar' })
  const {
    alt,
    children: childrenProp,
    className,
    component = 'div',
    imgProps,
    sizes,
    src,
    srcSet,
    variant = 'circular',
    ...other
  } = props

  let children

  // Use a hook instead of onError on the img element to support server-side rendering.
  const loaded = useLoaded({ ...imgProps, src, srcSet })
  const hasImg = src || srcSet
  const hasImgNotFailing = hasImg && loaded !== 'error'

  const styleProps = {
    ...props,
    colorDefault: !hasImgNotFailing,
    component,
    variant
  }

  const classes = useUtilityClasses(styleProps)

  if (hasImgNotFailing) {
    children = (
      <AvatarImg
        alt={alt}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        styleProps={styleProps}
        className={classes.img}
        {...imgProps}
      />
    )
  } else if (childrenProp != null) {
    children = childrenProp
  } else if (hasImg && alt) {
    children = alt[0]
  } else {
    children = <AvatarFallback className={classes.fallback} />
  }

  return (
    <AvatarRoot
      as={component}
      styleProps={styleProps}
      className={clsx(classes.root, className)}
      ref={ref}
      {...other}
    >
      {children}
    </AvatarRoot>
  )
}) as any

export default Avatar
