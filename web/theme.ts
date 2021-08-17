export const typography = {
  h1: {
    fontWeight: 500,
    fontSize: 35,
    letterSpacing: '-0.24px'
  },
  h2: {
    fontWeight: 500,
    fontSize: 29,
    letterSpacing: '-0.24px'
  },
  h3: {
    fontWeight: 500,
    fontSize: 24,
    letterSpacing: '-0.06px'
  },
  h4: {
    fontWeight: 500,
    fontSize: 20,
    letterSpacing: '-0.06px'
  },
  h5: {
    fontWeight: 500,
    fontSize: 16,
    letterSpacing: '-0.05px'
  },
  h6: {
    fontWeight: 500,
    fontSize: 14,
    letterSpacing: '-0.05px'
  },
  overline: {
    fontWeight: 500
  }
}

export const cardActionStyles: any = {
  position: 'absolute',
  right: (theme: any) => theme.spacing(1),
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center'
}
