#!/usr/bin/perl

while ( my $line = <> ) {
    if ( $line =~ m~(EVAL_SHUTTER{(.+)/(.+)})~ ) {
        my ( $n, $d ) = ( $2, $3 );
        my $res = $n / $d;
        $line =~ s/\Q$expr\E/$res/;
    }
    print $line;
}
