import React from 'react'
import { ListItem, ListItemAvatar, ListItemText, Skeleton } from '@material-ui/core'

export const LoadingList: React.FC<{ count?: number }> = ({ count = 3 }) => <>{Array.from({ length: count }, (_, i) => <ListItem key={i}>
  <ListItemAvatar><Skeleton animation='wave' variant='circular' width={40} height={40} /></ListItemAvatar>
  <ListItemText primary={<Skeleton animation='wave' />} />
</ListItem>)}</>
