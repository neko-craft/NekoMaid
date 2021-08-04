import React from 'react'
import { ListItem, ListItemAvatar, ListItemText, Skeleton, CircularProgress, Box } from '@material-ui/core'
import type { CircularProgressProps } from '@material-ui/core/CircularProgress'

export const LoadingList: React.FC<{ count?: number }> = ({ count = 3 }) => <>{Array.from({ length: count }, (_, i) => <ListItem key={i}>
  <ListItemAvatar><Skeleton animation='wave' variant='circular' width={40} height={40} /></ListItemAvatar>
  <ListItemText primary={<Skeleton animation='wave' />} />
</ListItem>)}</>

export const CircularLoading: React.FC<CircularProgressProps & { loading?: boolean }> = ({ loading, ...props }) => <Box sx={{
  position: 'absolute',
  inset: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: loading ? 2 : -1,
  backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.4)',
  backdropFilter: loading ? 'blur(1px)' : undefined,
  transition: '.5s',
  opacity: loading ? '1' : '0',
  pointerEvents: loading ? undefined : 'none'
}}>
  <CircularProgress {...props} />
</Box>
